from __future__ import annotations

import io
from collections.abc import Iterable
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
class ParseResult:
    source: str
    extracted_text: str
    chunks: list[str]


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


DEFAULT_SEPARATORS = ["\n\n", "\n", "。", "；", " ", ""]


class NoMergeRecursiveCharacterTextSplitter(RecursiveCharacterTextSplitter):
    """Keep separator-bounded fragments intact.

    ``_split_text`` still walks finer separators when a fragment is longer than
    ``chunk_size``. This override does not join the shorter fragments back
    together. The empty-separator fallback arrives as single characters of one
    oversized span; those are cut into ``chunk_size`` windows, not merged with
    neighboring spans.
    """

    def _merge_splits(self, splits: Iterable[str], separator: str) -> list[str]:
        del separator
        raw = [split for split in splits if split]
        if not raw:
            return []
        if len(raw) > 1 and all(self._length_function(split) <= 1 for split in raw):
            return self._cut_oversized("".join(raw))

        docs: list[str] = []
        for split in raw:
            text = split.strip() if self._strip_whitespace else split
            if not text:
                continue
            if self._length_function(text) > self._chunk_size:
                docs.extend(self._cut_oversized(text))
            else:
                docs.append(text)
        return docs

    def _cut_oversized(self, text: str) -> list[str]:
        if self._length_function(text) <= self._chunk_size:
            piece = text.strip() if self._strip_whitespace else text
            return [piece] if piece else []

        chunks: list[str] = []
        start = 0
        while start < len(text):
            piece = text[start : start + self._chunk_size]
            if self._strip_whitespace:
                piece = piece.strip()
            if piece:
                chunks.append(piece)
            start += self._chunk_size
        return chunks


def normalize_separators(separators: list[str] | None) -> list[str]:
    if separators is None:
        return list(DEFAULT_SEPARATORS)
    cleaned = [item for item in separators if item is not None]
    if not cleaned:
        return list(DEFAULT_SEPARATORS)
    if cleaned[-1] != "":
        cleaned.append("")
    return cleaned


def chunk_text(
    text: str,
    *,
    settings: Settings | None = None,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
    separators: list[str] | None = None,
) -> list[str]:
    settings = settings or get_settings()
    size = int(chunk_size if chunk_size is not None else settings.rag_chunk_size)
    overlap = int(chunk_overlap if chunk_overlap is not None else settings.rag_chunk_overlap)
    if size < 50:
        raise AppError("chunk_size must be at least 50", code="invalid_chunk_size", status_code=422)
    if overlap < 0:
        raise AppError("chunk_overlap must be >= 0", code="invalid_chunk_overlap", status_code=422)
    if overlap >= size:
        raise AppError(
            "chunk_overlap must be smaller than chunk_size",
            code="invalid_chunk_overlap",
            status_code=422,
        )
    splitter = NoMergeRecursiveCharacterTextSplitter(
        chunk_size=size,
        chunk_overlap=overlap,
        separators=normalize_separators(separators),
        keep_separator=True,
    )
    return splitter.split_text(text)


def parse_and_chunk(
    *,
    filename: str,
    content: bytes,
    settings: Settings | None = None,
) -> ParseResult:
    """Extract text and split into chunks. Does not call Embedding or Weaviate."""
    settings = settings or get_settings()
    source = Path(filename).name
    text = extract_text(source, content)
    chunks = chunk_text(text, settings=settings)
    if not chunks:
        raise AppError(
            "Document produced no chunks",
            code="empty_document",
            status_code=422,
        )
    return ParseResult(source=source, extracted_text=text, chunks=chunks)


def publish_to_weaviate(
    *,
    document_id: str,
    source: str,
    chunks: list[str],
    collection: str,
    settings: Settings | None = None,
) -> str:
    """Embed chunks and write vectors to the given Weaviate collection."""
    settings = settings or get_settings()
    collection_name = collection.strip()
    if not collection_name:
        raise AppError(
            "collection is required for publish",
            code="collection_required",
            status_code=422,
        )
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
            store = get_vector_store(
                client,
                collection=collection_name,
                settings=settings,
            )
            store.add_documents(documents)
    except AppError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise map_embedding_error(exc) from exc

    logger.info(
        "rag_publish document_id={} source={} collection={} chunks={}",
        document_id,
        source,
        collection_name,
        len(documents),
    )
    return collection_name


def new_document_id() -> str:
    return str(uuid4())
