import jwt

from app.config import settings


def verify_portal_token(token: str) -> dict | None:
    """Decode a JWT issued by the Bixing Tools portal."""
    try:
        return jwt.decode(
            token,
            settings.portal_jwt_secret,
            algorithms=[settings.portal_jwt_algorithm],
        )
    except jwt.InvalidTokenError:
        return None

