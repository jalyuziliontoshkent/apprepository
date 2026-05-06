from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from modules.common.config import Settings


def hash_password(password: str, rounds: int) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        if not plain or not hashed:
            return False
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except (TypeError, ValueError):
        return False


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def create_access_token(settings: Settings, user: dict[str, Any]) -> tuple[str, str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    jti = secrets.token_hex(16)
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "type": "access",
        "jti": jti,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, jti, expires_at


def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def get_refresh_expires_at(settings: Settings) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)


def decode_token(settings: Settings, token: str, expected_type: str = "access") -> dict[str, Any]:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    token_type = payload.get("type")
    if token_type != expected_type:
        raise jwt.InvalidTokenError(f"Invalid token type: expected {expected_type}, got {token_type}")
    return payload
