import os

from pydantic import field_validator
from pydantic_settings import BaseSettings

_BANNED_SECRET_PREFIXES = (
    "change-me",
    "changeme",
    "change_me",
    "secret",
    "password",
    "test",
    "default",
)


class Settings(BaseSettings):
    app_name: str = "bx-caller"
    app_env: str = "development"
    dev_bypass_auth: bool = False

    portal_jwt_secret: str
    portal_jwt_algorithm: str = "HS256"

    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = []

    agent_data_dir: str = "./agent_data"

    # Optional shared token for telephony callbacks that cannot carry the
    # portal's browser cookie. Leave empty to require portal-cookie auth.
    websocket_access_token: str = ""

    telephony_provider: str = "twilio"
    public_base_url: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("portal_jwt_secret")
    @classmethod
    def _check_jwt_secret(cls, v: str) -> str:
        lowered = v.strip().lower()
        if any(lowered.startswith(prefix) for prefix in _BANNED_SECRET_PREFIXES):
            raise ValueError(
                "PORTAL_JWT_SECRET starts with a well-known placeholder. "
                "Use the JWT_SECRET value from bixingai-tools."
            )
        if len(v) < 32:
            raise ValueError("PORTAL_JWT_SECRET must be at least 32 characters for HS256.")
        return v

    def model_post_init(self, __context) -> None:
        if self.app_env == "production" and self.dev_bypass_auth:
            raise ValueError(
                "DEV_BYPASS_AUTH=1 is set with APP_ENV=production. "
                "Unset DEV_BYPASS_AUTH or change APP_ENV."
            )


settings = Settings()
