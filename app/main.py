import asyncio
import json
import os
import traceback
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import redis.asyncio as redis
from fastapi import Body, Depends, FastAPI, HTTPException, Query, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.api.deps import PortalUser, get_current_user, get_redis, get_websocket_user
from app.config import settings
from app.storage import create_agent_store
from app.telephony import TelephonyProvider, get_telephony_provider
from bolna.helpers.logger_config import configure_logger

logger = configure_logger(__name__)


class CreateAgentPayload(BaseModel):
    agent_config: dict[str, Any]
    agent_prompts: dict[str, dict[str, str]] | None = None


class OutboundCallPayload(BaseModel):
    agent_id: str
    to: str
    provider: str = "twilio"


def _agent_key(portal_user_id: uuid.UUID, agent_id: str) -> str:
    return f"agent:{portal_user_id}:{agent_id}"


def _agent_pattern(agent_id: str) -> str:
    return f"agent:*:{agent_id}"


def _strip_agent_key(key: str) -> str:
    return key.rsplit(":", 1)[-1]


async def _store_agent_prompts(file_key: str, file_data: dict[str, dict[str, str]] | None) -> None:
    path = Path(settings.agent_data_dir) / file_key
    path.parent.mkdir(parents=True, exist_ok=True)
    await asyncio.to_thread(path.write_text, json.dumps(file_data), encoding="utf-8")


async def _read_agent_prompts(file_key: str) -> dict[str, dict[str, str]]:
    path = Path(settings.agent_data_dir) / file_key
    if not path.exists():
        return {}
    raw_prompts = await asyncio.to_thread(path.read_text, encoding="utf-8")
    prompts = json.loads(raw_prompts)
    return prompts if isinstance(prompts, dict) else {}


async def _prepare_agent_data(agent_data: CreateAgentPayload, assistant_status: str) -> dict[str, Any]:
    try:
        from bolna.models import AgentModel

        data_for_db = AgentModel(**agent_data.agent_config).model_dump()
    except ModuleNotFoundError:
        if settings.app_env == "production":
            raise
        data_for_db = dict(agent_data.agent_config)
    data_for_db["assistant_status"] = assistant_status

    for index, task in enumerate(data_for_db.get("tasks", [])):
        if task.get("task_type") != "extraction":
            continue

        extraction_prompt_llm = os.getenv("EXTRACTION_PROMPT_GENERATION_MODEL")
        if not extraction_prompt_llm:
            raise HTTPException(status_code=500, detail="Extraction model not configured")

        from bolna.llms import LiteLLM
        from bolna.prompts import EXTRACTION_PROMPT_GENERATION_PROMPT

        extraction_prompt_generation_llm = LiteLLM(model=extraction_prompt_llm, max_tokens=2000)
        extraction_details = task["tools_config"]["llm_agent"].get("extraction_details", "")
        extraction_prompt = await extraction_prompt_generation_llm.generate(
            messages=[
                {"role": "system", "content": EXTRACTION_PROMPT_GENERATION_PROMPT},
                {"role": "user", "content": extraction_details},
            ]
        )
        data_for_db["tasks"][index]["tools_config"]["llm_agent"]["extraction_json"] = extraction_prompt

    return data_for_db


async def _find_agent_for_callback(redis_client: redis.Redis, agent_id: str) -> tuple[str, dict[str, Any]]:
    matches = [key async for key in redis_client.scan_iter(match=_agent_pattern(agent_id), count=100)]
    if not matches:
        raise HTTPException(status_code=404, detail="Agent not found")
    if len(matches) > 1:
        raise HTTPException(status_code=409, detail="Agent id matched multiple portal users")

    agent_data = await redis_client.get(matches[0])
    if not agent_data:
        raise HTTPException(status_code=404, detail="Agent not found")
    return matches[0], json.loads(agent_data)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.environ.setdefault("PREPROCESS_DIR", settings.agent_data_dir)
    os.makedirs(settings.agent_data_dir, exist_ok=True)
    app.state.redis = create_agent_store(settings.redis_url)
    try:
        yield
    finally:
        await app.state.redis.aclose()


app = FastAPI(
    title="BX Caller API",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/health/ready")
async def readiness(redis_client: redis.Redis = Depends(get_redis)):
    try:
        pong = await redis_client.ping()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"status": "unhealthy", "failures": {"redis": f"{type(exc).__name__}: {exc}"}},
        ) from exc
    if not pong:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "failures": {"redis": "PING failed"}})
    return {"status": "ready", "checks": ["redis"]}


@app.get("/api/agent/{agent_id}")
async def get_agent(
    agent_id: str,
    include_prompts: bool = Query(default=False),
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    agent_data = await redis_client.get(_agent_key(user.portal_user_id, agent_id))
    if not agent_data:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent_config = json.loads(agent_data)
    if not include_prompts:
        return agent_config
    return {
        "agent_config": agent_config,
        "agent_prompts": await _read_agent_prompts(f"{agent_id}/conversation_details.json"),
    }


@app.post("/api/agent")
async def create_agent(
    agent_data: CreateAgentPayload,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    agent_uuid = str(uuid.uuid4())
    data_for_db = await _prepare_agent_data(agent_data, assistant_status="seeding")
    stored_prompt_file_path = f"{agent_uuid}/conversation_details.json"
    await asyncio.gather(
        redis_client.set(_agent_key(user.portal_user_id, agent_uuid), json.dumps(data_for_db)),
        _store_agent_prompts(stored_prompt_file_path, agent_data.agent_prompts),
    )
    return {"agent_id": agent_uuid, "state": "created"}


@app.put("/api/agent/{agent_id}")
async def edit_agent(
    agent_id: str,
    agent_data: CreateAgentPayload = Body(...),
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    key = _agent_key(user.portal_user_id, agent_id)
    if not await redis_client.exists(key):
        raise HTTPException(status_code=404, detail="Agent not found")

    data_for_db = await _prepare_agent_data(agent_data, assistant_status="updated")
    stored_prompt_file_path = f"{agent_id}/conversation_details.json"
    await asyncio.gather(
        redis_client.set(key, json.dumps(data_for_db)),
        _store_agent_prompts(stored_prompt_file_path, agent_data.agent_prompts),
    )
    return {"agent_id": agent_id, "state": "updated"}


@app.delete("/api/agent/{agent_id}")
async def delete_agent(
    agent_id: str,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    deleted = await redis_client.delete(_agent_key(user.portal_user_id, agent_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"agent_id": agent_id, "state": "deleted"}


@app.get("/api/all")
@app.get("/api/agents")
async def get_all_agents(
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    agents = []
    async for key in redis_client.scan_iter(match=f"agent:{user.portal_user_id}:*", count=100):
        data = await redis_client.get(key)
        if data:
            agents.append({"agent_id": _strip_agent_key(key), "data": json.loads(data)})
    return {"agents": agents}


@app.post("/api/calls/outbound")
async def place_outbound_call(
    call: OutboundCallPayload,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
    telephony_provider: TelephonyProvider = Depends(get_telephony_provider),
):
    if call.provider.lower() != telephony_provider.name:
        raise HTTPException(status_code=400, detail=f"Unsupported telephony provider: {call.provider}")
    if not await redis_client.exists(_agent_key(user.portal_user_id, call.agent_id)):
        raise HTTPException(status_code=404, detail="Agent not found")
    result = telephony_provider.place_outbound_call(call.agent_id, call.to)
    return result


def _verify_callback_token(token: str | None) -> None:
    if settings.websocket_access_token and token != settings.websocket_access_token:
        raise HTTPException(status_code=403, detail="Invalid callback token")


@app.api_route("/api/telephony/twilio/connect", methods=["GET", "POST"])
async def twilio_connect(
    agent_id: str = Query(...),
    token: str | None = Query(default=None),
):
    _verify_callback_token(token)
    from app.telephony.twilio import TwilioTelephonyProvider

    provider = TwilioTelephonyProvider.from_settings()
    return Response(content=provider.render_connect_twiml(agent_id), media_type="text/xml")


async def _run_agent_websocket(
    agent_id: str,
    websocket: WebSocket,
    callback_token: str | None,
):
    user = await get_websocket_user(websocket, callback_token)
    await websocket.accept()
    redis_client: redis.Redis = websocket.app.state.redis

    try:
        if user.via_callback_token:
            _, agent_config = await _find_agent_for_callback(redis_client, agent_id)
        else:
            retrieved_agent_config = await redis_client.get(_agent_key(user.portal_user_id, agent_id))
            if not retrieved_agent_config:
                await websocket.close(code=1008)
                return
            agent_config = json.loads(retrieved_agent_config)

        from bolna.agent_manager.assistant_manager import AssistantManager

        assistant_manager = AssistantManager(agent_config, websocket, agent_id)
        async for _, task_output in assistant_manager.run(local=True):
            logger.info(task_output)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for agent %s", agent_id)
    except Exception as exc:
        traceback.print_exc()
        logger.error("Error executing agent %s: %s", agent_id, exc)
        if websocket.client_state.name != "DISCONNECTED":
            await websocket.close(code=1011)


@app.websocket("/chat/v1/{agent_id}")
async def websocket_endpoint(
    agent_id: str,
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    await _run_agent_websocket(agent_id, websocket, token)


@app.websocket("/api/chat/v1/{agent_id}")
async def api_websocket_endpoint(
    agent_id: str,
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    await _run_agent_websocket(agent_id, websocket, token)
