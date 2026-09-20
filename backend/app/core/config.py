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
    # Remote embeddings via SiliconFlow (OpenAI-compatible). No local vector model.
    embedding_api_key: str = ""
    embedding_base_url: str = "https://api.siliconflow.cn/v1"
    embedding_model: str = "BAAI/bge-m3"
    embedding_batch_size: int = 32
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 120
    rag_top_k: int = 4

    # Object storage (Tencent COS)
    cos_enabled: bool = False
    cos_secret_id: str = ""
    cos_secret_key: str = ""
    cos_region: str = ""
    cos_bucket: str = ""
    cos_key_prefix: str = "documents/"
    cos_avatar_prefix: str = "avatars/"

    # Stage 7 — hardening
    # Comma-separated API keys. Auth auto-enables when non-empty unless AUTH_ENABLED overrides.
    api_keys: str = ""
    auth_enabled: bool | None = None
    rate_limit_per_minute: int = 60
    rate_limit_enabled: bool = True
    # JWT (Kong + direct API access)
    jwt_secret: str = ""
    jwt_issuer_normal: str = "nexus-law-normal"
    jwt_issuer_vip: str = "nexus-law-vip"
    jwt_expire_hours: int = 24
    # Trust X-User-* headers injected by Kong (enable in Docker behind gateway)
    trust_kong_headers: bool = False
    # Kong applies tier-based limits; skip duplicate in-app limiting for gateway traffic
    skip_app_rate_limit_for_gateway: bool = True
    # Comma-separated tool names; empty means all registered tools are allowed
    agent_tool_whitelist: str = "get_current_time,calculator,search_documents"
    prompt_guard_enabled: bool = True

    # Payment callback HMAC. Empty + DEBUG allows unsigned mock callbacks.
    payment_callback_secret: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def llm_configured(self) -> bool:
        return bool(self.llm_api_key.strip())

    @property
    def embedding_configured(self) -> bool:
        return bool(
            self.embedding_api_key.strip()
            and self.embedding_base_url.strip()
            and self.embedding_model.strip()
        )

    @property
    def api_key_set(self) -> set[str]:
        return {key.strip() for key in self.api_keys.split(",") if key.strip()}

    @property
    def is_auth_enabled(self) -> bool:
        if self.auth_enabled is not None:
            return self.auth_enabled
        return bool(self.api_key_set or self.jwt_secret.strip() or self.trust_kong_headers)

    @property
    def agent_tool_whitelist_set(self) -> set[str]:
        return {name.strip() for name in self.agent_tool_whitelist.split(",") if name.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
