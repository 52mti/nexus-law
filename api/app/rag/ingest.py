from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from loguru import logger
from pypdf import PdfReader

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.rag.embeddings import map_embedding_error
from app.rag.store import get_vector_store, weaviate_client

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf"}


@dataclass(slots=True)
class IngestResult:
    document_id: str
    source: str
    chunk_count: int
    collection: str


def extract_text(filename: str, content: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise AppError(
            f"Unsupported file type: {suffix or '(none)'}. Allowed: .txt, .md, .pdf",
            code="unsupported_file_type",
            status_code=422,
        )

    if suffix in {".txt", ".md"}:
        text = content.decode("utf-8", errors="ignore").strip()
    else:
        reader = PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages).strip()

    if not text:
        raise AppError(
            "Document has no extractable text",
            code="empty_document",
            status_code=422,
        )
    return text


def chunk_text(text: str, *, settings: Settings | None = None) -> list[str]:
    settings = settings or get_settings()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
    )
    return splitter.split_text(text)


def ingest_document(
    *,
    filename: str,
    content: bytes,
    settings: Settings | None = None,
) -> IngestResult:
    settings = settings or get_settings()
    source = Path(filename).name
    text = extract_text(source, content)
    chunks = chunk_text(text, settings=settings)
    document_id = str(uuid4())

    documents = [
        Document(
            page_content=chunk,
            metadata={
                "source": source,
                "document_id": document_id,
                "chunk_index": index,
            },
        )
        for index, chunk in enumerate(chunks)
    ]

    try:
        with weaviate_client(settings) as client:
            store = get_vector_store(client, settings=settings)
            store.add_documents(documents)
    except AppError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise map_embedding_error(exc) from exc

    logger.info(
        "rag_ingest source={} document_id={} chunks={}",
        source,
        document_id,
        len(documents),
    )
    return IngestResult(
        document_id=document_id,
        source=source,
        chunk_count=len(documents),
        collection=settings.weaviate_collection,
    )
