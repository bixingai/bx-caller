import uuid
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as redis
from pydantic import BaseModel, Field

from app.config import settings


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def entity_key(entity: str, portal_user_id: uuid.UUID, entity_id: str) -> str:
    return f"{entity}:{portal_user_id}:{entity_id}"


def entity_pattern(entity: str, portal_user_id: uuid.UUID) -> str:
    return f"{entity}:{portal_user_id}:*"


class ContactPayload(BaseModel):
    name: str
    phone_number: str
    email: str = ""
    company: str = ""
    tags: list[str] = Field(default_factory=list)
    notes: str = ""


class ContactRecord(ContactPayload):
    id: str
    created_at: str
    updated_at: str


class CampaignPayload(BaseModel):
    name: str
    agent_id: str
    contact_ids: list[str] = Field(default_factory=list)
    script: str = ""
    schedule: str = "immediate"


class CampaignRecord(CampaignPayload):
    id: str
    status: str = "draft"
    created_at: str
    updated_at: str
    launched_at: str | None = None


class LaunchCampaignPayload(BaseModel):
    compliance_ack: bool
    provider: str | None = None


class CallSessionRecord(BaseModel):
    id: str
    campaign_id: str
    agent_id: str
    contact_id: str
    contact_name: str
    to_number: str
    provider: str
    provider_call_id: str
    status: str
    created_at: str
    updated_at: str


class AuditRecord(BaseModel):
    id: str
    event: str
    entity_id: str = ""
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: str


async def set_record(redis_client: redis.Redis, entity: str, portal_user_id: uuid.UUID, record: BaseModel) -> None:
    await redis_client.set(entity_key(entity, portal_user_id, record.id), record.model_dump_json())


async def get_record(
    redis_client: redis.Redis,
    entity: str,
    portal_user_id: uuid.UUID,
    entity_id: str,
    model: type[BaseModel],
) -> BaseModel | None:
    raw = await redis_client.get(entity_key(entity, portal_user_id, entity_id))
    if not raw:
        return None
    return model.model_validate_json(raw)


async def list_records(
    redis_client: redis.Redis,
    entity: str,
    portal_user_id: uuid.UUID,
    model: type[BaseModel],
) -> list[BaseModel]:
    records = []
    async for key in redis_client.scan_iter(match=entity_pattern(entity, portal_user_id), count=100):
        raw = await redis_client.get(key)
        if raw:
            records.append(model.model_validate_json(raw))
    return sorted(records, key=lambda item: getattr(item, "created_at", ""))


async def delete_record(redis_client: redis.Redis, entity: str, portal_user_id: uuid.UUID, entity_id: str) -> int:
    return await redis_client.delete(entity_key(entity, portal_user_id, entity_id))


async def append_audit(
    redis_client: redis.Redis,
    portal_user_id: uuid.UUID,
    event: str,
    entity_id: str = "",
    details: dict[str, Any] | None = None,
) -> AuditRecord:
    audit = AuditRecord(
        id=str(uuid.uuid4()),
        event=event,
        entity_id=entity_id,
        details=details or {},
        created_at=utc_now(),
    )
    await set_record(redis_client, "audit", portal_user_id, audit)
    return audit


def provider_readiness() -> dict[str, Any]:
    provider = settings.telephony_provider.lower()
    required_by_provider = {
        "twilio": {
            "PUBLIC_BASE_URL": settings.public_base_url,
            "WEBSOCKET_ACCESS_TOKEN": settings.websocket_access_token,
            "TWILIO_ACCOUNT_SID": settings.twilio_account_sid,
            "TWILIO_AUTH_TOKEN": settings.twilio_auth_token,
            "TWILIO_PHONE_NUMBER": settings.twilio_phone_number,
        }
    }
    required = required_by_provider.get(provider, {})
    missing = [name for name, value in required.items() if not value]
    return {"provider": provider, "ready": not missing, "missing": missing}
