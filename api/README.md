# Nexus Law Agent API (FastAPI)

Python 3.11+ FastAPI service for the LangChain/LangGraph legal agent. Lives under `api/` and is developed in staged milestones.

## Prerequisites

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (recommended)
- Docker (optional, for PostgreSQL / Redis)

## Install

```bash
cd api
uv sync --extra dev
cp .env.example .env
```

## Run

```bash
cd api
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/v1/health

## Infrastructure (Stage 1+)

PostgreSQL and Redis are reserved for later stages. Start them locally with:

```bash
cd api
docker compose up -d
```

## Database migrations

```bash
cd api
docker compose up -d postgres
uv run alembic upgrade head
# rollback one step:
# uv run alembic downgrade -1
```

## Stage status

| Stage | Status |
|-------|--------|
| 0 Requirements freeze | Done |
| 1 Project skeleton | Done |
| 2 Data layer | Done |
| 3 LLM chat | Current |
| 4 LangGraph agent | Pending |
| 5 Streaming | Pending |
| 6 RAG (optional) | Pending |
| 7 Hardening | Pending |

## Health check example

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Expected shape:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "app_name": "nexus-law-api",
    "env": "development"
  },
  "error": null,
  "request_id": "..."
}
```

## Chat completions (Stage 3)

Configure `LLM_API_KEY` (and optional `LLM_BASE_URL` / `LLM_MODEL`) in `.env`, then:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"What is a contract?\"}]}"
```

Missing `LLM_API_KEY` returns HTTP 503 with `error.code = llm_not_configured`.
