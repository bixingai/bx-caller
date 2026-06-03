from html import escape
from urllib.parse import urlencode

from fastapi import HTTPException

from app.config import settings
from app.telephony.service import CallResult


class TwilioTelephonyProvider:
    name = "twilio"

    def __init__(
        self,
        account_sid: str,
        auth_token: str,
        from_number: str,
        public_base_url: str,
        callback_token: str,
        client=None,
    ) -> None:
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number
        self.public_base_url = public_base_url.rstrip("/")
        self.callback_token = callback_token
        self._client = client

    @classmethod
    def from_settings(cls) -> "TwilioTelephonyProvider":
        return cls(
            account_sid=settings.twilio_account_sid,
            auth_token=settings.twilio_auth_token,
            from_number=settings.twilio_phone_number,
            public_base_url=settings.public_base_url,
            callback_token=settings.websocket_access_token,
        )

    def place_outbound_call(self, agent_id: str, to_number: str) -> CallResult:
        self._require_config()
        client = self._client or self._build_client()
        call = client.calls.create(
            to=to_number,
            from_=self.from_number,
            url=self.connect_url(agent_id),
            method="POST",
            record=True,
        )
        return CallResult(provider=self.name, call_id=call.sid, status=getattr(call, "status", "queued"))

    def connect_url(self, agent_id: str) -> str:
        query = urlencode({"agent_id": agent_id, "token": self.callback_token})
        return f"{self.public_base_url}/api/telephony/twilio/connect?{query}"

    def stream_url(self, agent_id: str) -> str:
        scheme_url = self.public_base_url
        if scheme_url.startswith("https://"):
            scheme_url = "wss://" + scheme_url.removeprefix("https://")
        elif scheme_url.startswith("http://"):
            scheme_url = "ws://" + scheme_url.removeprefix("http://")
        query = urlencode({"token": self.callback_token})
        return f"{scheme_url}/chat/v1/{agent_id}?{query}"

    def render_connect_twiml(self, agent_id: str) -> str:
        stream_url = escape(self.stream_url(agent_id), quote=True)
        return f'<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="{stream_url}" /></Connect></Response>'

    def _require_config(self) -> None:
        missing = [
            name
            for name, value in {
                "TWILIO_ACCOUNT_SID": self.account_sid,
                "TWILIO_AUTH_TOKEN": self.auth_token,
                "TWILIO_PHONE_NUMBER": self.from_number,
                "PUBLIC_BASE_URL": self.public_base_url,
                "WEBSOCKET_ACCESS_TOKEN": self.callback_token,
            }.items()
            if not value
        ]
        if missing:
            raise HTTPException(status_code=500, detail=f"Missing telephony settings: {', '.join(missing)}")

    def _build_client(self):
        from twilio.rest import Client

        return Client(self.account_sid, self.auth_token)
