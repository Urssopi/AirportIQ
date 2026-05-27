from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    aerodatabox_api_key: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""
    resend_api_key: str = ""
    supabase_jwt_secret: str = ""  # optional — enables local JWT verification

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8081"]


@lru_cache
def _load() -> Settings:
    return Settings()


settings = _load()
