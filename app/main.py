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
from app.launch import (
    AuditRecord,
    CallSessionRecord,
    CampaignPayload,
    CampaignRecord,
    ContactPayload,
    ContactRecord,
    LaunchCampaignPayload,
    append_audit,
    delete_record,
    get_record,
    list_records,
    provider_readiness,
    set_record,
    utc_now,
)
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


def _model_dump(record: Any) -> dict[str, Any]:
    return record.model_dump() if hasattr(record, "model_dump") else dict(record)


def _call_result_dict(result: Any) -> dict[str, str]:
    if hasattr(result, "__dataclass_fields__"):
        return {
            "provider": result.provider,
            "call_id": result.call_id,
            "status": result.status,
        }
    return dict(result)


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


@app.get("/api/provider-readiness")
async def get_provider_readiness(user: PortalUser = Depends(get_current_user)):
    del user
    return provider_readiness()


@app.get("/api/contacts")
async def list_contacts(
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    contacts = await list_records(redis_client, "contact", user.portal_user_id, ContactRecord)
    return {"contacts": [_model_dump(contact) for contact in contacts]}


@app.post("/api/contacts")
async def create_contact(
    payload: ContactPayload,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    now = utc_now()
    contact = ContactRecord(id=str(uuid.uuid4()), created_at=now, updated_at=now, **payload.model_dump())
    await set_record(redis_client, "contact", user.portal_user_id, contact)
    await append_audit(redis_client, user.portal_user_id, "contact.created", contact.id)
    return _model_dump(contact)


@app.get("/api/contacts/{contact_id}")
async def get_contact(
    contact_id: str,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    contact = await get_record(redis_client, "contact", user.portal_user_id, contact_id, ContactRecord)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return _model_dump(contact)


@app.put("/api/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    payload: ContactPayload,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    existing = await get_record(redis_client, "contact", user.portal_user_id, contact_id, ContactRecord)
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact = ContactRecord(
        id=contact_id,
        created_at=existing.created_at,
        updated_at=utc_now(),
        **payload.model_dump(),
    )
    await set_record(redis_client, "contact", user.portal_user_id, contact)
    await append_audit(redis_client, user.portal_user_id, "contact.updated", contact.id)
    return _model_dump(contact)


@app.delete("/api/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    deleted = await delete_record(redis_client, "contact", user.portal_user_id, contact_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Contact not found")
    await append_audit(redis_client, user.portal_user_id, "contact.deleted", contact_id)
    return {"contact_id": contact_id, "state": "deleted"}


@app.get("/api/campaigns")
async def list_campaigns(
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    campaigns = await list_records(redis_client, "campaign", user.portal_user_id, CampaignRecord)
    return {"campaigns": [_model_dump(campaign) for campaign in campaigns]}


@app.post("/api/campaigns")
async def create_campaign(
    payload: CampaignPayload,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    now = utc_now()
    campaign = CampaignRecord(id=str(uuid.uuid4()), created_at=now, updated_at=now, **payload.model_dump())
    await set_record(redis_client, "campaign", user.portal_user_id, campaign)
    await append_audit(redis_client, user.portal_user_id, "campaign.created", campaign.id)
    return _model_dump(campaign)


@app.get("/api/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    campaign = await get_record(redis_client, "campaign", user.portal_user_id, campaign_id, CampaignRecord)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _model_dump(campaign)


@app.put("/api/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    payload: CampaignPayload,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    existing = await get_record(redis_client, "campaign", user.portal_user_id, campaign_id, CampaignRecord)
    if not existing:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign = CampaignRecord(
        id=campaign_id,
        status=existing.status,
        created_at=existing.created_at,
        updated_at=utc_now(),
        launched_at=existing.launched_at,
        **payload.model_dump(),
    )
    await set_record(redis_client, "campaign", user.portal_user_id, campaign)
    await append_audit(redis_client, user.portal_user_id, "campaign.updated", campaign.id)
    return _model_dump(campaign)


@app.post("/api/campaigns/{campaign_id}/launch")
async def launch_campaign(
    campaign_id: str,
    payload: LaunchCampaignPayload,
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
    telephony_provider: TelephonyProvider = Depends(get_telephony_provider),
):
    if not payload.compliance_ack:
        raise HTTPException(status_code=400, detail="Compliance acknowledgment is required")
    if payload.provider and payload.provider.lower() != telephony_provider.name:
        raise HTTPException(status_code=400, detail=f"Unsupported telephony provider: {payload.provider}")

    campaign = await get_record(redis_client, "campaign", user.portal_user_id, campaign_id, CampaignRecord)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if not campaign.contact_ids:
        raise HTTPException(status_code=400, detail="Campaign has no contacts")
    if not await redis_client.exists(_agent_key(user.portal_user_id, campaign.agent_id)):
        raise HTTPException(status_code=404, detail="Agent not found")

    contacts = []
    for contact_id in campaign.contact_ids:
        contact = await get_record(redis_client, "contact", user.portal_user_id, contact_id, ContactRecord)
        if not contact:
            raise HTTPException(status_code=400, detail="Campaign references missing contacts")
        contacts.append(contact)

    readiness = provider_readiness()
    if not readiness["ready"]:
        raise HTTPException(status_code=400, detail={"message": "Telephony provider is not ready", **readiness})

    now = utc_now()
    sessions = []
    for contact in contacts:
        call_result = _call_result_dict(telephony_provider.place_outbound_call(campaign.agent_id, contact.phone_number))
        session = CallSessionRecord(
            id=str(uuid.uuid4()),
            campaign_id=campaign.id,
            agent_id=campaign.agent_id,
            contact_id=contact.id,
            contact_name=contact.name,
            to_number=contact.phone_number,
            provider=call_result["provider"],
            provider_call_id=call_result["call_id"],
            status=call_result["status"],
            created_at=now,
            updated_at=now,
        )
        await set_record(redis_client, "call_session", user.portal_user_id, session)
        await append_audit(
            redis_client,
            user.portal_user_id,
            "call_session.created",
            session.id,
            {"campaign_id": campaign.id, "contact_id": contact.id},
        )
        sessions.append(session)

    campaign.status = "launched"
    campaign.launched_at = now
    campaign.updated_at = now
    await set_record(redis_client, "campaign", user.portal_user_id, campaign)
    await append_audit(
        redis_client,
        user.portal_user_id,
        "campaign.launched",
        campaign.id,
        {"session_count": len(sessions)},
    )
    return {"campaign": _model_dump(campaign), "sessions": [_model_dump(session) for session in sessions]}


@app.get("/api/call-sessions")
async def list_call_sessions(
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    sessions = await list_records(redis_client, "call_session", user.portal_user_id, CallSessionRecord)
    return {"call_sessions": [_model_dump(session) for session in sessions]}


@app.get("/api/audit-logs")
async def list_audit_logs(
    user: PortalUser = Depends(get_current_user),
    redis_client: redis.Redis = Depends(get_redis),
):
    audit_logs = await list_records(redis_client, "audit", user.portal_user_id, AuditRecord)
    return {"audit_logs": [_model_dump(item) for item in audit_logs]}


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
