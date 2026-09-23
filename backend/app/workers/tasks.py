from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.services.conversation_memory import refresh_memory_summary, write_generated_title
from app.workers.celery_app import celery_app

Job = Callable[[AsyncSession], Awaitable[None]]


async def run_db_job(work: Job) -> None:
    """Own engine per task so the worker loop is not shared with the API process."""
    settings = get_settings()
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    try:
        async with factory() as session:
            try:
                await work(session)
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    finally:
        await engine.dispose()


def _run(work: Job) -> None:
    asyncio.run(run_db_job(work))


@celery_app.task(name="summarize_conversation_memory")
def summarize_conversation_memory(conversation_id: str) -> None:
    async def _job(session: AsyncSession) -> None:
        await refresh_memory_summary(session, conversation_id)

    _run(_job)


@celery_app.task(name="generate_conversation_title")
def generate_conversation_title(conversation_id: str) -> None:
    async def _job(session: AsyncSession) -> None:
        await write_generated_title(session, conversation_id)

    _run(_job)


def schedule_conversation_jobs(
    session,
    conversation_id: str,
    *,
    generate_title: bool,
) -> None:
    """Enqueue after the request transaction commits so the worker can read the rows."""
    from sqlalchemy import event

    sync = session.sync_session
    jobs: dict = sync.info.setdefault("conversation_jobs", {})
    current = jobs.get(conversation_id, {"generate_title": False})
    current["generate_title"] = bool(current["generate_title"] or generate_title)
    jobs[conversation_id] = current
    if sync.info.get("conversation_jobs_listening"):
        return
    sync.info["conversation_jobs_listening"] = True

    def _after_commit(committed) -> None:
        pending = dict(committed.info.get("conversation_jobs") or {})
        committed.info["conversation_jobs"] = {}
        committed.info["conversation_jobs_listening"] = False
        for conv_id, spec in pending.items():
            _safe_enqueue(conv_id, generate_title=bool(spec["generate_title"]))

    event.listen(sync, "after_commit", _after_commit, once=True)


def _safe_enqueue(conversation_id: str, *, generate_title: bool) -> None:
    try:
        summarize_conversation_memory.delay(conversation_id)
        if generate_title:
            generate_conversation_title.delay(conversation_id)
    except Exception:
        logger.warning("conversation job enqueue failed conversation_id={}", conversation_id)
