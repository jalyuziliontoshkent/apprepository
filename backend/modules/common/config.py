from __future__ import annotations

import os
import ssl
from dataclasses import dataclass
from urllib.parse import urlparse

import certifi


def _get_required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is not configured")
    return value


def load_database_url() -> str:
    raw = os.environ.get("DATABASE_URL")
    if raw is None or not str(raw).strip():
        raise RuntimeError(
            "DATABASE_URL yo'q yoki bo'sh. Render Environment yoki backend/.env ichiga to'liq DSN kiriting."
        )

    url = str(raw).strip()
    if len(url) >= 2 and url[0] == url[-1] and url[0] in "\"'":
        url = url[1:-1].strip()

    url = url.lstrip("\ufeff\u200b\u200c\u200d").strip()
    parsed = urlparse(url.replace("postgres://", "postgresql://", 1))
    host = parsed.hostname
    if not host or not str(host).strip():
        raise RuntimeError(
            "DATABASE_URL noto'g'ri: hostname bo'sh. Supabase/Render connection string'ni to'liq kiriting."
        )

    host_name = str(host).strip().lower()
    if host_name == "..." or host_name.startswith("...") or "..." in host_name:
        raise RuntimeError("DATABASE_URL ichida namuna matn ('...') qolib ketgan.")
    if host_name.startswith(".") or ".." in host_name or host_name.startswith("@"):
        raise RuntimeError(f"DATABASE_URL hostname noto'g'ri: {host!r}")

    return url


def asyncpg_ssl_context_for_dsn(dsn: str) -> ssl.SSLContext | None:
    try:
        host = (urlparse(dsn.replace("postgres://", "postgresql://", 1)).hostname or "").lower()
    except Exception:
        return None

    if "supabase.co" not in host:
        return None

    strict = os.environ.get("ASYNCPG_STRICT_SSL", "").strip().lower() in {"1", "true", "yes"}
    if strict:
        return ssl.create_default_context(cafile=certifi.where())

    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def parse_cors_origins(raw: str | None) -> list[str]:
    if not raw:
        return [
            "http://localhost:19006",
            "http://localhost:8081",
            "http://127.0.0.1:19006",
            "http://127.0.0.1:8081",
        ]
    return [value.strip().rstrip("/") for value in raw.split(",") if value.strip()]


@dataclass(frozen=True)
class Settings:
    database_url: str
    jwt_secret: str
    jwt_algorithm: str
    access_token_minutes: int
    refresh_token_days: int
    password_hash_rounds: int
    cors_origins: list[str]
    app_env: str
    enable_demo_seed_data: bool

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


def load_settings() -> Settings:
    app_env = os.environ.get("APP_ENV", "development").strip().lower() or "development"
    enable_demo_seed_data = os.environ.get(
        "ENABLE_DEMO_SEED_DATA",
        "false" if app_env == "production" else "true",
    ).strip().lower() in {"1", "true", "yes"}

    return Settings(
        database_url=load_database_url(),
        jwt_secret=_get_required_env("JWT_SECRET"),
        jwt_algorithm=os.environ.get("JWT_ALGORITHM", "HS256").strip() or "HS256",
        access_token_minutes=max(int(os.environ.get("ACCESS_TOKEN_MINUTES", "30")), 5),
        refresh_token_days=max(int(os.environ.get("REFRESH_TOKEN_DAYS", "30")), 1),
        password_hash_rounds=max(int(os.environ.get("PASSWORD_HASH_ROUNDS", "12")), 10),
        cors_origins=parse_cors_origins(os.environ.get("CORS_ORIGINS")),
        app_env=app_env,
        enable_demo_seed_data=enable_demo_seed_data,
    )
