from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "nexus-law-api"
    env: str = "development"
    api_prefix: str = "/api/v1"
    debug: bool = False

    cors_origins: str = "*"

    # Stage 2+
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/nexus_law"
    redis_url: str = "redis://localhost:6379/0"

    # Stage 3+
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 60.0
    llm_max_retries: int = 2
    # When false, chat logs omit message text (only counts / latency / tokens)
    llm_log_content: bool = False

    # Stage 4+
    agent_max_iterations: int = 6

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def llm_configured(self) -> bool:
        return bool(self.llm_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
