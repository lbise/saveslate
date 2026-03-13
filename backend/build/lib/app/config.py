"""Configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = (
        "postgresql+asyncpg://saveslate:password@db:5432/saveslate"
    )

    # Auth / JWT
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours
    csrf_secret_key: str = "change-me-csrf-secret"

    # App
    cors_origins: str = "http://localhost:5173"
    api_prefix: str = "/api"
    rate_limit_enabled: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
