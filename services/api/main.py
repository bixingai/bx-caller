import json
import os
import secrets
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field


DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"


def _parse_api_keys(raw: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for item in raw.split(","):
        item = item.strip()
        if not item:
            continue
        if ":" not in item:
            continue
        key, role = item.split(":", 1)
        parsed[key.strip()] = role.strip().lower()
    return parsed


def _parse_origins(raw: str) -> list[str]:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


API_KEYS = _parse_api_keys(os.getenv("BX_API_KEYS", ""))
CORS_ORIGINS = _parse_origins(os.getenv("BX_CORS_ALLOW_ORIGINS", DEFAULT_ALLOWED_ORIGINS))
RATE_LIMIT_PER_MINUTE = int(os.getenv("BX_RATE_LIMIT_PER_MINUTE", "120"))


class ApiContext(BaseModel):
    api_key: str
    role: str


request_windows: dict[str, deque[float]] = defaultdict(deque)
idempotency_store: dict[str, dict[str, Any]] = {}
tenants: dict[str, dict[str, Any]] = {}
workspaces: dict[str, dict[str, Any]] = {}
agents: dict[str, dict[str, Any]] = {}
calls: dict[str, dict[str, Any]] = {}


class TenantCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=120)
    retention_days: int = Field(default=30, ge=1, le=3650)


class WorkspaceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tenant_id: str = Field(min_length=1)
    name: str = Field(min_length=2, max_length=120)


class AgentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace_id: str = Field(min_length=1)
    name: str = Field(min_length=2, max_length=120)
    prompt: str = Field(min_length=1)
    config: dict[str, Any] = Field(default_factory=dict)


class CallCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace_id: str = Field(min_length=1)
    agent_id: str = Field(min_length=1)
    recipient_phone_number: str = Field(min_length=6, max_length=30)
    metadata: dict[str, Any] = Field(default_factory=dict)


app = FastAPI(title="BX Caller Production API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-Id"],
)


@app.middleware("http")
async def add_security_headers_and_rate_limit(request: Request, call_next):
    api_key = _extract_bearer_key(request.headers.get("Authorization"))
    if api_key:
        now = time.time()
        window = request_windows[api_key]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= RATE_LIMIT_PER_MINUTE:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        window.append(now)

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
    return response


def _extract_bearer_key(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2:
        return None
    scheme, token = parts
    if scheme.lower() != "bearer":
        return None
    return token.strip()


def _forbidden():
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


async def require_api_key(authorization: str = Header(default="")) -> ApiContext:
    key = _extract_bearer_key(authorization)
    if not key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    role = API_KEYS.get(key)
    if not role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")
    return ApiContext(api_key=key, role=role)


def require_role(*allowed_roles: str):
    async def validator(ctx: ApiContext = Depends(require_api_key)) -> ApiContext:
        if ctx.role not in allowed_roles:
            _forbidden()
        return ctx

    return validator


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


@app.get("/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/ready")
async def ready() -> dict[str, str]:
    if not API_KEYS:
        raise HTTPException(status_code=503, detail="BX_API_KEYS not configured")
    return {"status": "ready"}


@app.post("/v1/tenants")
async def create_tenant(payload: TenantCreate, _: ApiContext = Depends(require_role("admin"))):
    tenant_id = _new_id("tn")
    tenants[tenant_id] = {
        "tenant_id": tenant_id,
        "name": payload.name,
        "retention_days": payload.retention_days,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return tenants[tenant_id]


@app.get("/v1/tenants")
async def list_tenants(_: ApiContext = Depends(require_role("admin", "ops", "viewer"))):
    return {"items": list(tenants.values())}


@app.post("/v1/workspaces")
async def create_workspace(payload: WorkspaceCreate, _: ApiContext = Depends(require_role("admin", "ops"))):
    if payload.tenant_id not in tenants:
        raise HTTPException(status_code=404, detail="tenant not found")

    workspace_id = _new_id("ws")
    workspaces[workspace_id] = {
        "workspace_id": workspace_id,
        "tenant_id": payload.tenant_id,
        "name": payload.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return workspaces[workspace_id]


@app.get("/v1/workspaces")
async def list_workspaces(
    tenant_id: Optional[str] = None,
    _: ApiContext = Depends(require_role("admin", "ops", "viewer")),
):
    items = list(workspaces.values())
    if tenant_id:
        items = [item for item in items if item["tenant_id"] == tenant_id]
    return {"items": items}


@app.post("/v1/agents")
async def create_agent(payload: AgentCreate, _: ApiContext = Depends(require_role("admin", "ops"))):
    if payload.workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="workspace not found")

    agent_id = _new_id("ag")
    agents[agent_id] = {
        "agent_id": agent_id,
        "workspace_id": payload.workspace_id,
        "name": payload.name,
        "prompt": payload.prompt,
        "config": payload.config,
        "state": "created",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return agents[agent_id]


@app.get("/v1/agents")
async def list_agents(workspace_id: Optional[str] = None, _: ApiContext = Depends(require_role("admin", "ops", "viewer"))):
    items = list(agents.values())
    if workspace_id:
        items = [item for item in items if item["workspace_id"] == workspace_id]
    return {"items": items}


@app.post("/v1/calls")
async def create_call(
    payload: CallCreate,
    response: Response,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    _: ApiContext = Depends(require_role("admin", "ops")),
):
    if payload.workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="workspace not found")
    if payload.agent_id not in agents:
        raise HTTPException(status_code=404, detail="agent not found")

    if not idempotency_key:
        idempotency_key = secrets.token_hex(16)

    if idempotency_key in idempotency_store:
        response.headers["X-Idempotent-Replay"] = "true"
        return idempotency_store[idempotency_key]

    call_id = _new_id("cl")
    call_data = {
        "call_id": call_id,
        "workspace_id": payload.workspace_id,
        "agent_id": payload.agent_id,
        "recipient_phone_number": payload.recipient_phone_number,
        "metadata": payload.metadata,
        "state": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    calls[call_id] = call_data
    idempotency_store[idempotency_key] = call_data
    response.headers["Idempotency-Key"] = idempotency_key
    return call_data


@app.get("/v1/calls")
async def list_calls(workspace_id: Optional[str] = None, _: ApiContext = Depends(require_role("admin", "ops", "viewer"))):
    items = list(calls.values())
    if workspace_id:
        items = [item for item in items if item["workspace_id"] == workspace_id]
    return {"items": items}


@app.post("/v1/webhooks/telephony")
async def telephony_webhook(
    request: Request,
    x_bx_signature: str = Header(default="", alias="X-BX-Signature"),
    _: ApiContext = Depends(require_role("admin", "ops")),
):
    shared_secret = os.getenv("BX_TELEPHONY_WEBHOOK_SECRET", "")
    if not shared_secret:
        raise HTTPException(status_code=503, detail="webhook secret not configured")

    body = await request.body()
    expected = secrets.compare_digest(x_bx_signature, _sign_payload(shared_secret, body))
    if not expected:
        raise HTTPException(status_code=401, detail="invalid signature")

    return {"status": "accepted"}


def _sign_payload(secret: str, payload: bytes) -> str:
    import hmac
    import hashlib

    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


@app.websocket("/v1/ws/monitor")
async def monitor_ws(websocket: WebSocket):
    authz = websocket.headers.get("authorization", "")
    key = _extract_bearer_key(authz)
    if not key or key not in API_KEYS:
        await websocket.close(code=4401)
        return

    await websocket.accept()

    try:
        while True:
            _ = await websocket.receive_text()
            await websocket.send_text(
                json.dumps(
                    {
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "tenant_count": len(tenants),
                        "workspace_count": len(workspaces),
                        "agent_count": len(agents),
                        "call_count": len(calls),
                    }
                )
            )
    except WebSocketDisconnect:
        return
