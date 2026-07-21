# Nexus Law Agent API (FastAPI)

Python 3.11+ FastAPI service for the LangChain/LangGraph legal agent. Lives under `api/` and is developed in staged milestones.

## Prerequisites

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (recommended)
- Docker (PostgreSQL / Redis / Weaviate)

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

## Infrastructure

```bash
cd api
docker compose up -d
```

Weaviate (dev & prod):
- REST: `http://localhost:8080`
- gRPC: `localhost:50051`

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
| 3 LLM chat | Done |
| 4 LangGraph agent | Done |
| 5 Streaming | Done |
| 6 RAG (Weaviate) | Current |
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

## Agent run (Stage 4)

```bash
curl -X POST http://127.0.0.1:8000/api/v1/agents/run \
  -H "Content-Type: application/json" \
  -d "{\"input\":\"What time is it in UTC? Also compute 15*8.\",\"debug\":true}"
```

- Pass `conversation_id` to continue an existing session.
- `debug=true` returns `tool_trace` (tool name / args / result).
- Built-in tools: `get_current_time`, `calculator`, `search_documents`.
- Loop guard: `AGENT_MAX_ITERATIONS` (default 6).
- Responses include `sources` when RAG retrieval returned matches.

## Agent stream (Stage 5)

SSE endpoint:

```bash
curl -N -X POST http://127.0.0.1:8000/api/v1/agents/run/stream \
  -H "Content-Type: application/json" \
  -d "{\"input\":\"What time is it in UTC? Compute 12*9.\",\"debug\":true}"
```

Event types:
- `token` — incremental assistant text
- `tool_start` / `tool_end` — tool lifecycle
- `final` — completed answer (+ optional `tool_trace` when `debug=true`)
- `error` — failure payload

Client disconnect cancels the downstream LangGraph stream (logged as `sse_client_disconnected` / `agent_stream_cancelled`).

## RAG / Weaviate (Stage 6)

Start Weaviate:

```bash
cd api
docker compose up -d weaviate
```

Upload a document (`.txt` / `.md` / `.pdf`):

```bash
curl -X POST http://127.0.0.1:8000/api/v1/rag/documents \
  -F "file=@./sample.md"
```

Ask the agent about the uploaded content:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/agents/run \
  -H "Content-Type: application/json" \
  -d "{\"input\":\"According to the uploaded document, what is the notice period?\",\"debug\":true}"
```

Vector store is **Weaviate** for both development and production (`WEAVIATE_HOST` / `WEAVIATE_HTTP_PORT=8080` / `WEAVIATE_GRPC_PORT=50051`).

If your chat proxy does not expose `/embeddings`, set `EMBEDDING_BASE_URL` / `EMBEDDING_API_KEY` to an OpenAI-compatible embeddings endpoint.

If host ports `8080`/`50051` are already used by another Weaviate container, reuse that instance — compose service `weaviate` is optional when an equivalent local Weaviate is running.
