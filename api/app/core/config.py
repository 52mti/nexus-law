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

    # Stage 6 — Weaviate (dev & prod)
    weaviate_host: str = "localhost"
    weaviate_http_port: int = 8080
    weaviate_grpc_port: int = 50051
    weaviate_collection: str = "NexusLawDocuments"
    # Defaults fall back to LLM_* when empty (see properties below)
    embedding_api_key: str = ""
    embedding_base_url: str = ""
    embedding_model: str = "text-embedding-3-small"
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 120
    rag_top_k: int = 4

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

    @property
    def resolved_embedding_base_url(self) -> str:
        # Explicit embedding URL wins as-is; LLM fallback appends /v1 when missing
        # (many OpenAI-compatible proxies expose chat at root but embeddings under /v1).
        if self.embedding_base_url.strip():
            return self.embedding_base_url.strip().rstrip("/")
        base = self.llm_base_url.strip().rstrip("/")
        if base and not base.endswith("/v1"):
            return f"{base}/v1"
        return base


@lru_cache
def get_settings() -> Settings:
    return Settings()
