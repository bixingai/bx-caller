import uuid
from dataclasses import dataclass

from fastapi import Cookie, Depends, HTTPException, Request, WebSocket
from app.config import settings
from app.core.security import verify_portal_token

_DEV_PORTAL_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@dataclass(frozen=True)
class PortalUser:
    portal_user_id: uuid.UUID
    via_callback_token: bool = False


def _dev_bypass_enabled() -> bool:
    return settings.dev_bypass_auth and settings.app_env != "production"


def _portal_user_from_token(access_token: str | None) -> PortalUser:
    if _dev_bypass_enabled():
        return PortalUser(portal_user_id=_DEV_PORTAL_USER_ID)

    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_portal_token(access_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        portal_user_id = uuid.UUID(str(payload.get("sub")))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid token payload") from exc

    return PortalUser(portal_user_id=portal_user_id)


async def get_current_user(access_token: str | None = Cookie(default=None)) -> PortalUser:
    return _portal_user_from_token(access_token)


async def get_redis(request: Request):
    return request.app.state.redis


async def get_websocket_user(websocket: WebSocket, callback_token: str | None = None) -> PortalUser:
    if callback_token and settings.websocket_access_token and callback_token == settings.websocket_access_token:
        return PortalUser(portal_user_id=_DEV_PORTAL_USER_ID, via_callback_token=True)

    try:
        return _portal_user_from_token(websocket.cookies.get("access_token"))
    except HTTPException:
        await websocket.close(code=1008)
        raise
