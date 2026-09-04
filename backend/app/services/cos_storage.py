from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from loguru import logger
from qcloud_cos import CosConfig, CosS3Client  # type: ignore[import-untyped]

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError


@dataclass(slots=True, frozen=True)
class CosUploadResult:
    bucket: str
    region: str
    key: str
    url: str
    etag: str | None
    uploaded_at: datetime


def _build_client(settings: Settings) -> CosS3Client:
    if not settings.cos_secret_id.strip() or not settings.cos_secret_key.strip():
        raise AppError(
            "COS credentials missing. Set COS_SECRET_ID and COS_SECRET_KEY.",
            code="cos_not_configured",
            status_code=503,
        )
    if not settings.cos_region.strip() or not settings.cos_bucket.strip():
        raise AppError(
            "COS_REGION and COS_BUCKET are required when COS_ENABLED=true.",
            code="cos_not_configured",
            status_code=503,
        )
    config = CosConfig(
        Region=settings.cos_region.strip(),
        SecretId=settings.cos_secret_id.strip(),
        SecretKey=settings.cos_secret_key.strip(),
        Scheme="https",
    )
    return CosS3Client(config)


def build_object_key(
    *,
    document_id: str,
    filename: str,
    settings: Settings | None = None,
) -> str:
    settings = settings or get_settings()
    prefix = settings.cos_key_prefix.strip().lstrip("/")
    if prefix and not prefix.endswith("/"):
        prefix = f"{prefix}/"
    safe_name = Path(filename).name or "file"
    # Avoid collisions: documents/{document_id}/{uuid}_{filename}
    return f"{prefix}{document_id}/{uuid4().hex[:8]}_{safe_name}"


def public_object_url(*, bucket: str, region: str, key: str) -> str:
    """Default virtual-hosted-style COS URL (no custom CDN domain)."""
    return f"https://{bucket}.cos.{region}.myqcloud.com/{key.lstrip('/')}"


def upload_bytes(
    *,
    content: bytes,
    document_id: str,
    filename: str,
    content_type: str | None = None,
    settings: Settings | None = None,
) -> CosUploadResult:
    """Upload original file bytes to Tencent COS. Blocking; call via to_thread."""
    settings = settings or get_settings()
    if not settings.cos_enabled:
        raise AppError(
            "COS upload is disabled (COS_ENABLED=false).",
            code="cos_disabled",
            status_code=400,
        )

    client = _build_client(settings)
    bucket = settings.cos_bucket.strip()
    region = settings.cos_region.strip()
    key = build_object_key(document_id=document_id, filename=filename, settings=settings)

    try:
        response = client.put_object(
            Bucket=bucket,
            Body=content,
            Key=key,
            ContentType=content_type or "application/octet-stream",
            EnableMD5=False,
        )
    except AppError:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.warning("cos_upload_failed document_id={} error={}", document_id, type(exc).__name__)
        raise AppError(
            "Failed to upload file to Tencent COS",
            code="cos_upload_failed",
            status_code=502,
            details={"error": str(exc)},
        ) from exc

    etag = None
    if isinstance(response, dict):
        etag = response.get("ETag") or response.get("etag")
        if isinstance(etag, str):
            etag = etag.strip('"')

    url = public_object_url(bucket=bucket, region=region, key=key)
    logger.info("cos_upload_ok document_id={} key={}", document_id, key)
    return CosUploadResult(
        bucket=bucket,
        region=region,
        key=key,
        url=url,
        etag=etag,
        uploaded_at=datetime.now(UTC),
    )


def delete_object(
    *,
    key: str,
    bucket: str | None = None,
    settings: Settings | None = None,
) -> None:
    """Delete one object from Tencent COS. Blocking; call via to_thread."""
    settings = settings or get_settings()
    if not settings.cos_enabled:
        raise AppError(
            "COS delete is disabled (COS_ENABLED=false).",
            code="cos_disabled",
            status_code=400,
        )
    object_key = (key or "").strip().lstrip("/")
    if not object_key:
        raise AppError("COS object key is empty", code="cos_key_required", status_code=422)

    client = _build_client(settings)
    target_bucket = (bucket or settings.cos_bucket).strip()
    try:
        client.delete_object(Bucket=target_bucket, Key=object_key)
    except AppError:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.warning("cos_delete_failed key={} error={}", object_key, type(exc).__name__)
        raise AppError(
            f"Failed to delete COS object '{object_key}'",
            code="cos_delete_failed",
            status_code=502,
            details={"error": str(exc), "key": object_key},
        ) from exc
    logger.info("cos_delete_ok bucket={} key={}", target_bucket, object_key)


def delete_objects(
    *,
    items: list[tuple[str | None, str]],
    settings: Settings | None = None,
) -> int:
    """Delete many COS objects. items are (bucket|None, key). Returns deleted count.

    Raises on the first failure so callers can abort before dropping PG rows.
    """
    settings = settings or get_settings()
    deleted = 0
    for bucket, key in items:
        if not (key or "").strip():
            continue
        delete_object(key=key, bucket=bucket, settings=settings)
        deleted += 1
    return deleted
