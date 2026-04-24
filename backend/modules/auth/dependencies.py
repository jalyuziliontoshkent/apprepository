from __future__ import annotations

from datetime import datetime, timezone

import jwt
from fastapi import HTTPException, Request

from modules.auth.security import decode_token


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")

    token = auth_header[7:]
    settings = request.app.state.settings
    cache = request.app.state.cache
    logger = request.app.state.logger

    try:
        payload = decode_token(settings, token, expected_type="access")
        jti = str(payload.get("jti") or "").strip()
        if not jti:
            raise HTTPException(401, "Invalid token")

        db = await request.app.state.get_pool()
        revoked = await db.fetchval(
            "SELECT 1 FROM revoked_tokens WHERE token_jti = $1 AND expires_at > NOW() LIMIT 1",
            jti,
        )
        if revoked:
            raise HTTPException(401, "Token revoked")

        user_id = str(payload.get("sub") or "").strip()
        if not user_id:
            raise HTTPException(401, "Invalid token")

        cache_key = f"user_auth_{user_id}"
        cached_user = cache.get(cache_key)
        if cached_user:
            return cached_user

        row = await db.fetchrow("SELECT * FROM users WHERE id::text = $1", user_id)
        if not row:
            raise HTTPException(401, "User not found")

        user = dict(row)
        user["id"] = str(user["id"])
        user.pop("password_hash", None)
        cache.set(cache_key, user, 60)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid access token: %s", exc)
        raise HTTPException(401, "Invalid token")


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


async def require_worker(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "worker":
        raise HTTPException(403, "Worker only")
    return user


async def revoke_access_token(request: Request, jti: str, expires_at: datetime) -> None:
    if not jti:
        return
    db = await request.app.state.get_pool()
    await db.execute(
        """
        INSERT INTO revoked_tokens (token_jti, expires_at, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (token_jti) DO NOTHING
        """,
        jti,
        expires_at,
        datetime.now(timezone.utc),
    )
