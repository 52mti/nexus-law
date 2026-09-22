from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, UploadFile

from app.api.v1.admin.deps import AdminContext, require_permission
from app.core.biz import ok
from app.schemas.admin import (
    DatasetCreateRequest,
    DatasetUpdateRequest,
    DocumentChunksImportRequest,
    DocumentChunksPreviewRequest,
    DocumentChunksUpdateRequest,
    IdRequest,
)
from app.services import document as document_service
from app.services.admin import knowledge as knowledge_service
from app.services.admin.common import page_args, parse_dt

router = APIRouter()


@router.get("/dataset/list")
async def dataset_list(
    keyword: str | None = Query(default=None),
    region: str | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    current, size = page_args(current, size)
    data = await knowledge_service.list_datasets(
        ctx.session,
        keyword=keyword,
        region=region,
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/dataset/detail")
async def dataset_detail(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.get_dataset_detail(ctx.session, id)
    return ok(data)


@router.post("/dataset/create")
async def dataset_create(
    body: DatasetCreateRequest,
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.create_dataset(
        ctx.session,
        admin_id=ctx.user.id,
        name=body.name,
        title=body.title,
        description=body.description,
        region=body.region,
        visibility=body.visibility,
    )
    return ok(data)


@router.post("/dataset/update")
async def dataset_update(
    body: DatasetUpdateRequest,
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.update_dataset(
        ctx.session,
        admin_id=ctx.user.id,
        dataset_id=body.id,
        title=body.title,
        description=body.description,
        region=body.region,
        visibility=body.visibility,
    )
    return ok(data)


@router.post("/dataset/delete")
async def dataset_delete(
    body: IdRequest,
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.delete_dataset(
        ctx.session,
        admin_id=ctx.user.id,
        dataset_id=body.id,
    )
    return ok(data, "知识库已删除")


@router.get("/document/list")
async def document_list(
    dataset_id: str | None = Query(default=None),
    region: str | None = Query(default=None),
    law_level: str | None = Query(default=None),
    status: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    current: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    current, size = page_args(current, size)
    data = await knowledge_service.list_documents(
        ctx.session,
        dataset_id=dataset_id,
        region=region,
        law_level=law_level,
        status=status,
        keyword=keyword,
        current=current,
        size=size,
    )
    return ok(data)


@router.get("/document/detail")
async def document_detail(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.get_document_detail(ctx.session, id)
    return ok(data)


@router.get("/document/chunks")
async def document_chunks(
    id: str = Query(min_length=1),
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.list_document_chunks(ctx.session, id)
    return ok(data)


@router.post("/document/upload")
async def document_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    dataset_id: str | None = Form(default=None),
    dataset_name: str | None = Form(default=None),
    title: str | None = Form(default=None),
    law_level: str | None = Form(default=None),
    region: str | None = Form(default=None),
    effective_at: str | None = Form(default=None),
    expired_at: str | None = Form(default=None),
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    content = await file.read()
    data = await knowledge_service.upload_document(
        ctx.session,
        admin_id=ctx.user.id,
        filename=file.filename or "document.txt",
        content=content,
        content_type=file.content_type,
        dataset_id=dataset_id,
        dataset_name=dataset_name,
        title=title,
        law_level=law_level,
        region=region,
        effective_at=parse_dt(effective_at),
        expired_at=parse_dt(expired_at),
    )
    await ctx.session.commit()
    background_tasks.add_task(document_service.run_parse_task, data["id"])
    return ok(data)


@router.post("/document/chunks/update")
async def document_chunks_update(
    body: DocumentChunksUpdateRequest,
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.update_chunks(
        ctx.session,
        admin_id=ctx.user.id,
        document_id=body.id,
        chunks=[item.model_dump() for item in body.chunks],
    )
    return ok(data)


@router.post("/document/chunks/preview")
async def document_chunks_preview(
    body: DocumentChunksPreviewRequest,
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.preview_chunks(
        ctx.session,
        document_id=body.id,
        chunk_size=body.chunk_size,
        chunk_overlap=body.chunk_overlap,
        separators=body.separators,
    )
    return ok(data)


@router.post("/document/chunks/import")
async def document_chunks_import(
    body: DocumentChunksImportRequest,
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.import_chunks(
        ctx.session,
        admin_id=ctx.user.id,
        document_id=body.id,
        chunks=[item.model_dump() for item in body.chunks],
        title=body.title,
        law_level=body.law_level,
        region=body.region,
        effective_at=parse_dt(body.effective_at),
        expired_at=parse_dt(body.expired_at),
    )
    return ok(data, "切片已导入")


@router.post("/document/publish")
async def document_publish(
    body: IdRequest,
    background_tasks: BackgroundTasks,
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.publish_document(
        ctx.session,
        admin_id=ctx.user.id,
        document_id=body.id,
    )
    await ctx.session.commit()
    background_tasks.add_task(document_service.run_publish_task, data["id"])
    return ok(data)


@router.post("/document/unpublish")
async def document_unpublish(
    body: IdRequest,
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.unpublish_document(
        ctx.session,
        admin_id=ctx.user.id,
        document_id=body.id,
    )
    return ok(data, "文档已下架")


@router.post("/document/delete")
async def document_delete(
    body: IdRequest,
    ctx: AdminContext = Depends(require_permission("kb:manage")),
) -> dict:
    data = await knowledge_service.delete_document(
        ctx.session,
        admin_id=ctx.user.id,
        document_id=body.id,
    )
    return ok(data, "文档已删除")
