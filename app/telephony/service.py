from dataclasses import dataclass
from typing import Protocol

from fastapi import HTTPException

from app.config import settings


@dataclass(frozen=True)
class CallResult:
    provider: str
    call_id: str
    status: str


class TelephonyProvider(Protocol):
    name: str

    def place_outbound_call(self, agent_id: str, to_number: str) -> CallResult | dict[str, str]: ...


def get_telephony_provider() -> TelephonyProvider:
    provider = settings.telephony_provider.lower()
    if provider == "twilio":
        from app.telephony.twilio import TwilioTelephonyProvider

        return TwilioTelephonyProvider.from_settings()
    raise HTTPException(status_code=400, detail=f"Unsupported telephony provider: {settings.telephony_provider}")
