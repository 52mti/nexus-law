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
    llm_log_content: bool = False

    # Stage 4+
    agent_max_iterations: int = 6

    # Stage 6 — Weaviate
    weaviate_host: str = "localhost"
    weaviate_http_port: int = 8080
    weaviate_grpc_port: int = 50051
    weaviate_collection: str = "NexusLawDocuments"
    embedding_api_key: str = ""
    embedding_base_url: str = ""
    embedding_model: str = "text-embedding-3-small"
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 120
    rag_top_k: int = 4

    # Stage 7 — hardening
    # Comma-separated API keys. Auth auto-enables when non-empty unless AUTH_ENABLED overrides.
    api_keys: str = ""
    auth_enabled: bool | None = None
    rate_limit_per_minute: int = 60
    rate_limit_enabled: bool = True
    # Comma-separated tool names; empty means all registered tools are allowed
    agent_tool_whitelist: str = "get_current_time,calculator,search_documents"
    prompt_guard_enabled: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def llm_configured(self) -> bool:
        return bool(self.llm_api_key.strip())

    @property
    def resolved_embedding_api_key(self) -> str:
        return self.embedding_api_key.strip() or self.llm_api_key.strip()

    @staticmethod
    def _ensure_openai_v1_base(url: str) -> str:
        """Normalize OpenAI-compatible base URLs to end with /v1."""
        base = url.strip().rstrip("/")
        if not base:
            return base
        if base.endswith("/v1"):
            return base
        return f"{base}/v1"

    @property
    def resolved_embedding_base_url(self) -> str:
        if self.embedding_base_url.strip():
            return self._ensure_openai_v1_base(self.embedding_base_url)
        return self._ensure_openai_v1_base(self.llm_base_url)

    @property
    def api_key_set(self) -> set[str]:
        return {key.strip() for key in self.api_keys.split(",") if key.strip()}

    @property
    def is_auth_enabled(self) -> bool:
        if self.auth_enabled is not None:
            return self.auth_enabled
        return bool(self.api_key_set)

    @property
    def agent_tool_whitelist_set(self) -> set[str]:
        return {name.strip() for name in self.agent_tool_whitelist.split(",") if name.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
