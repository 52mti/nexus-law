# Nexus Law Agent API (FastAPI)

Python 3.11+ FastAPI service for the LangChain/LangGraph legal agent. Lives under `api/` and is developed in staged milestones.

## Prerequisites

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (recommended)
- Local PostgreSQL 16+ (not Docker)
- Docker (Redis / Weaviate only)

## Install

```bash
cd api
uv sync --extra dev
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to your local Postgres, for example:

```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/nexus_law
```

Create the database once (PowerShell, adjust password):

```powershell
$env:PGPASSWORD = "YOUR_PASSWORD"
& "D:\postgresql\bin\psql.exe" -U postgres -h 127.0.0.1 -c "CREATE DATABASE nexus_law;"
```

## Run

```bash
cd api
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/v1/health

## Infrastructure

Redis and Weaviate still use Docker:

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
| 6 RAG (Weaviate) | Done |
| 7 Hardening | Current |

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

## RAG / Weaviate (Stage 6 + HITL)

Start Weaviate:

```bash
cd api
docker compose up -d weaviate
```

Human-in-the-loop ingest (upload → draft chunks → edit → publish):

```bash
# 0) Optional: create dataset (upload also auto-creates by collection name)
curl -X POST http://127.0.0.1:8000/api/v1/rag/datasets \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"NexusLawDocuments\",\"title\":\"默认知识库\"}"

# 1) Upload: parse/chunk + (if COS_ENABLED) archive original to Tencent COS.
#    Form field `collection` = dataset name / Weaviate class (required).
#    BackgroundTask → status draft; oss_url on GET /documents/{id}
curl -X POST http://127.0.0.1:8000/api/v1/rag/documents \
  -F "file=@./sample.md" \
  -F "collection=NexusLawDocuments"
# → { "data": { "document_id": "...", "dataset_id": "...", "collection": "NexusLawDocuments" } }

# 2) Preview chunks (poll until status=draft)
curl http://127.0.0.1:8000/api/v1/rag/documents/{id}/chunks

# 3) Optional: save corrections (edit / add / delete; server reindexes 0..n-1)
curl -X PUT http://127.0.0.1:8000/api/v1/rag/documents/{id}/chunks \
  -H "Content-Type: application/json" \
  -d "{\"chunks\":[{\"content\":\"revised chunk text\"}]}"

# 4) Confirm: Embedding + Weaviate write
curl -X POST http://127.0.0.1:8000/api/v1/rag/documents/{id}/publish

# 5) Delete one document (COS + Weaviate vectors by document_id + PG chunks)
curl -X DELETE http://127.0.0.1:8000/api/v1/rag/documents/{id}

# 6) Delete a dataset (COS originals + PG dataset/docs/chunks + Weaviate collection)
curl -X DELETE http://127.0.0.1:8000/api/v1/rag/datasets/LaborContracts
# (alias) curl -X DELETE http://127.0.0.1:8000/api/v1/rag/collections/LaborContracts
```

Ask the agent about the **published** content:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/agents/run \
  -H "Content-Type: application/json" \
  -d "{\"input\":\"According to the uploaded document, what is the notice period?\",\"debug\":true}"
```

Vector store is **Weaviate** for both development and production (`WEAVIATE_HOST` / `WEAVIATE_HTTP_PORT=8080` / `WEAVIATE_GRPC_PORT=50051`).

Embeddings use local Hugging Face `BAAI/bge-m3` (`EMBEDDING_MODEL` / `EMBEDDING_DEVICE`). First run downloads the model (~2GB). Use `EMBEDDING_DEVICE=cuda` if a GPU is available.

Switching embedding models changes vector dimensions (bge-m3 = 1024). Delete the Weaviate collection and re-publish documents after a model change.

If host ports `8080`/`50051` are already used by another Weaviate container, reuse that instance — compose service `weaviate` is optional when an equivalent local Weaviate is running.

## Hardening (Stage 7)

### Auth
Set one or more API keys:

```bash
API_KEYS=dev-secret-key
```

Call protected APIs with:

```bash
curl http://127.0.0.1:8000/api/v1/agents/run \
  -H "X-API-Key: dev-secret-key" \
  -H "Content-Type: application/json" \
  -d "{\"input\":\"hello\"}"
```

Also accepts `Authorization: Bearer <key>`.  
`GET /api/v1/health` and `GET /api/v1/health/ready` remain public.

### Rate limit
In-memory sliding window (`RATE_LIMIT_PER_MINUTE`, default 60). Returns `429` / `rate_limited`.

### Tool whitelist
`AGENT_TOOL_WHITELIST=get_current_time,calculator,search_documents`

### Prompt guard
Blocks common prompt-injection phrases (`PROMPT_GUARD_ENABLED=true`).

### Readiness
```bash
curl http://127.0.0.1:8000/api/v1/health/ready
```
Checks database / Weaviate / Redis(optional) / LLM configured.
