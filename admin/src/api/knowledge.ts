import { apiGet, apiPost, apiUpload } from '@/lib/request'
import type { ChunkItem, DatasetItem, DocumentItem, PageResult } from '@/lib/types'

export function listDatasets(params: {
  keyword?: string
  region?: string
  current?: number
  size?: number
}) {
  return apiGet<PageResult<DatasetItem>>('/admin/dataset/list', params)
}

export function getDatasetDetail(id: string) {
  return apiGet<DatasetItem>('/admin/dataset/detail', { id })
}

export function createDataset(body: {
  name: string
  title?: string
  description?: string
  region?: string
  visibility?: string
}) {
  return apiPost<DatasetItem>('/admin/dataset/create', body)
}

export function updateDataset(body: {
  id: string
  title?: string
  description?: string
  region?: string
  visibility?: string
}) {
  return apiPost<DatasetItem>('/admin/dataset/update', body)
}

export function deleteDataset(id: string) {
  return apiPost<{ id: string }>('/admin/dataset/delete', { id })
}

export function listDocuments(params: {
  dataset_id?: string
  region?: string
  law_level?: string
  status?: string
  keyword?: string
  current?: number
  size?: number
}) {
  return apiGet<PageResult<DocumentItem>>('/admin/document/list', params)
}

export function getDocumentDetail(id: string) {
  return apiGet<DocumentItem>('/admin/document/detail', { id })
}

export function listDocumentChunks(id: string) {
  return apiGet<{ document_id: string; status: string; records: ChunkItem[]; total: number }>(
    '/admin/document/chunks',
    { id },
  )
}

export function uploadDocument(form: FormData) {
  return apiUpload<DocumentItem>('/admin/document/upload', form)
}

export function updateDocumentChunks(id: string, chunks: { id?: string; content: string }[]) {
  return apiPost<DocumentItem>('/admin/document/chunks/update', { id, chunks })
}

export function previewDocumentChunks(body: {
  id: string
  chunk_size: number
  chunk_overlap: number
  separators?: string[]
}) {
  return apiPost<{
    document_id: string
    status: string
    chunk_size: number
    chunk_overlap: number
    separators: string[]
    source_chars: number
    records: ChunkItem[]
    total: number
  }>('/admin/document/chunks/preview', body)
}

export function importDocumentChunks(body: {
  id: string
  chunks: { content: string }[]
  title?: string
  law_level?: string
  region?: string
  effective_at?: string
  expired_at?: string
}) {
  return apiPost<{ document_id: string; status: string; records: ChunkItem[]; total: number }>(
    '/admin/document/chunks/import',
    body,
  )
}

export function publishDocument(id: string) {
  return apiPost<DocumentItem>('/admin/document/publish', { id })
}

export function unpublishDocument(id: string) {
  return apiPost<DocumentItem>('/admin/document/unpublish', { id })
}

export function deleteDocument(id: string) {
  return apiPost<{ id: string }>('/admin/document/delete', { id })
}
