from celery import Celery

from app.core.config import get_settings

_settings = get_settings()

celery_app = Celery(
    "nexus_law",
    broker=_settings.celery_broker_url,
    backend=_settings.celery_result_backend,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_ignore_result=True,
    broker_connection_retry_on_startup=False,
    broker_connection_retry=False,
    broker_transport_options={
        "socket_connect_timeout": 1,
        "socket_timeout": 1,
        "retry_on_timeout": False,
    },
)
app = celery_app


def _register_tasks() -> None:
    from app.workers import tasks  # noqa: F401


_register_tasks()
