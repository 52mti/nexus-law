import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Button, DatePicker, Form, Input, InputNumber, List, Pagination, Slider, Space, Spin, Tag, Typography, message } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getDocumentDetail,
  importDocumentChunks,
  listDocumentChunks,
  previewDocumentChunks,
  publishDocument,
  unpublishDocument,
} from '@/api/knowledge'
import { PageHeader } from '@/components/page'
import type { ChunkItem } from '@/lib/types'

export const Route = createFileRoute('/_authenticated/knowledge/documents/$id')({
  component: DocumentChunksPage,
})

const DEFAULT_SEPARATORS = ['\\n\\n', '\\n', '。', '；', ' ']
const DEFAULT_PAGE_SIZE = 10

function decodeSeparators(text: string) {
  return text
    .split('\n')
    .map((line) => line.replaceAll('\\n', '\n'))
    .filter((line, index, list) => !(line === '' && index === list.length - 1))
}

function overlapLength(previous: string, current: string) {
  const max = Math.min(previous.length, current.length, 240)
  for (let size = max; size > 0; size -= 1) {
    if (current.startsWith(previous.slice(-size))) return size
  }
  return 0
}

function DocumentChunksPage() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const previewRef = useRef<HTMLDivElement>(null)
  const [chunkSize, setChunkSize] = useState(800)
  const [overlap, setOverlap] = useState(120)
  const [separatorsText, setSeparatorsText] = useState(DEFAULT_SEPARATORS.join('\n'))
  const [title, setTitle] = useState('')
  const [lawLevel, setLawLevel] = useState('')
  const [region, setRegion] = useState('')
  const [effectiveAt, setEffectiveAt] = useState<Dayjs | null>(null)
  const [expiredAt, setExpiredAt] = useState<Dayjs | null>(null)
  const [previewChunks, setPreviewChunks] = useState<ChunkItem[]>([])
  const [seeded, setSeeded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [previewMeta, setPreviewMeta] = useState<{
    chunk_size: number
    chunk_overlap: number
    source_chars: number
    total: number
  } | null>(null)

  const docQuery = useQuery({
    queryKey: ['admin-document', id],
    queryFn: () => getDocumentDetail(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'uploading' || status === 'parsing' || status === 'publishing' ? 2000 : false
    },
  })
  const chunksQuery = useQuery({
    queryKey: ['admin-chunks', id],
    queryFn: () => listDocumentChunks(id),
    enabled: !!docQuery.data && ['draft', 'failed', 'published', 'publishing'].includes(docQuery.data.status),
  })

  const doc = docQuery.data
  const savedChunks = chunksQuery.data?.records || []
  const busy = doc?.status === 'uploading' || doc?.status === 'parsing' || doc?.status === 'publishing'
  const canEdit = doc?.status === 'draft' || doc?.status === 'failed'
  const hasSourceText = (doc?.extracted_text_chars ?? 0) > 0

  useEffect(() => {
    if (!doc || seeded) return
    setTitle(doc.title || '')
    setLawLevel(doc.law_level || '')
    setRegion(doc.region || '')
    setEffectiveAt(doc.effective_at ? dayjs(doc.effective_at) : null)
    setExpiredAt(doc.expired_at ? dayjs(doc.expired_at) : null)
    setSeeded(true)
  }, [doc, seeded])

  useEffect(() => {
    if (savedChunks.length && previewChunks.length === 0) {
      setPreviewChunks(savedChunks)
      setPage(1)
    }
  }, [savedChunks, previewChunks.length])

  const safeOverlap = Math.min(overlap, Math.max(chunkSize - 1, 0))
  const pageCount = Math.max(1, Math.ceil(previewChunks.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageChunks = previewChunks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const previewMut = useMutation({
    mutationFn: () =>
      previewDocumentChunks({
        id,
        chunk_size: chunkSize,
        chunk_overlap: safeOverlap,
        separators: decodeSeparators(separatorsText),
      }),
    onSuccess: (data) => {
      setPreviewChunks(data.records)
      setPage(1)
      setPreviewMeta({
        chunk_size: data.chunk_size,
        chunk_overlap: data.chunk_overlap,
        source_chars: data.source_chars,
        total: data.total,
      })
      message.success(`已重新计算 ${data.total} 个切片`)
    },
  })
  const importMut = useMutation({
    mutationFn: () => {
      if (!previewChunks.length) {
        throw new Error('没有可导入的切片')
      }
      return importDocumentChunks({
        id,
        chunks: previewChunks.map((item) => ({ content: item.content })),
        title,
        law_level: lawLevel,
        region,
        effective_at: effectiveAt?.toISOString(),
        expired_at: expiredAt?.toISOString(),
      })
    },
    onSuccess: (data) => {
      setPreviewChunks(data.records)
      setPage(1)
      message.success('切片已保存并导入')
      void queryClient.invalidateQueries({ queryKey: ['admin-chunks', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin-document', id] })
    },
  })
  const publishMut = useMutation({
    mutationFn: () => publishDocument(id),
    onSuccess: () => {
      message.success('已提交发布')
      void queryClient.invalidateQueries({ queryKey: ['admin-document', id] })
    },
  })
  const unpublishMut = useMutation({
    mutationFn: () => unpublishDocument(id),
    onSuccess: () => {
      message.success('已下架')
      void queryClient.invalidateQueries({ queryKey: ['admin-document', id] })
    },
  })

  const stats = useMemo(() => {
    const chars = previewChunks.reduce((sum, item) => sum + (item.char_count ?? item.content.length), 0)
    return { count: previewChunks.length, chars }
  }, [previewChunks])

  useEffect(() => {
    previewRef.current?.scrollTo({ top: 0 })
  }, [currentPage, pageSize])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title={doc?.title || doc?.source || '切片预览'}
        description={doc?.error_message || '调节切片参数后重新计算，确认无误再保存并导入'}
      >
        {doc ? <Tag>{doc.status}</Tag> : null}
        <Link to="/knowledge">
          <Button>返回知识库</Button>
        </Link>
        {canEdit ? (
          <Button
            type="primary"
            disabled={publishMut.isPending || !previewChunks.length}
            onClick={() => publishMut.mutate()}
          >
            发布
          </Button>
        ) : null}
        {doc?.status === 'published' ? <Button onClick={() => unpublishMut.mutate()}>下架</Button> : null}
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="max-h-[40%] min-h-0 w-full overflow-auto lg:max-h-none lg:w-[35%] lg:shrink-0">
          <Typography.Title level={5}>切片参数</Typography.Title>
          <Typography.Paragraph type="secondary">
            RecursiveCharacterTextSplitter · 原文 {doc?.extracted_text_chars ?? 0} 字
          </Typography.Paragraph>
          <Form layout="vertical">
            <Form.Item label="切片大小">
              <Space orientation="vertical" className="w-full">
                <InputNumber
                  min={50}
                  max={8000}
                  step={10}
                  value={chunkSize}
                  disabled={busy}
                  onChange={(value) => setChunkSize(Number(value) || 50)}
                />
                <Slider
                  min={50}
                  max={4000}
                  step={10}
                  value={Math.min(chunkSize, 4000)}
                  disabled={busy}
                  onChange={setChunkSize}
                />
              </Space>
            </Form.Item>
            <Form.Item label="重叠长度">
              <Space orientation="vertical" className="w-full">
                <InputNumber
                  min={0}
                  max={Math.max(chunkSize - 1, 0)}
                  step={5}
                  value={safeOverlap}
                  disabled={busy}
                  onChange={(value) => setOverlap(Number(value) || 0)}
                />
                <Slider
                  min={0}
                  max={Math.max(chunkSize - 1, 0)}
                  step={5}
                  value={safeOverlap}
                  disabled={busy}
                  onChange={setOverlap}
                />
              </Space>
            </Form.Item>
            <Form.Item
              label="拆分符号"
              extra="每行一个分隔符，可用 \n 表示换行，将按优先级递归切分"
            >
              <Input.TextArea
                rows={6}
                value={separatorsText}
                disabled={busy}
                onChange={(e) => setSeparatorsText(e.target.value)}
              />
              <Button
                type="link"
                size="small"
                disabled={busy}
                onClick={() => setSeparatorsText(DEFAULT_SEPARATORS.join('\n'))}
              >
                恢复默认
              </Button>
            </Form.Item>
            <Typography.Title level={5}>元数据提取</Typography.Title>
            <Form.Item label="标题">
              <Input value={title} disabled={!canEdit || busy} onChange={(e) => setTitle(e.target.value)} />
            </Form.Item>
            <Form.Item label="效力层级">
              <Input
                value={lawLevel}
                disabled={!canEdit || busy}
                onChange={(e) => setLawLevel(e.target.value)}
                placeholder="法律 / 行政法规 / 地方法规"
              />
            </Form.Item>
            <Form.Item label="地域">
              <Input value={region} disabled={!canEdit || busy} onChange={(e) => setRegion(e.target.value)} />
            </Form.Item>
            <Form.Item label="生效时间">
              <DatePicker
                className="w-full"
                showTime
                value={effectiveAt}
                disabled={!canEdit || busy}
                onChange={setEffectiveAt}
              />
            </Form.Item>
            <Form.Item label="失效时间">
              <DatePicker
                className="w-full"
                showTime
                value={expiredAt}
                disabled={!canEdit || busy}
                onChange={setExpiredAt}
              />
            </Form.Item>
          </Form>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Typography.Paragraph type="secondary" className="!mb-2 shrink-0">
            预览 {stats.count} 段 · {stats.chars} 字
            {previewMeta ? ` · 参数 ${previewMeta.chunk_size}/${previewMeta.chunk_overlap}` : ''}
          </Typography.Paragraph>
          <div ref={previewRef} className="min-h-0 flex-1 overflow-auto">
            <Spin spinning={docQuery.isLoading || chunksQuery.isLoading || busy}>
            <List
              bordered
              className="min-h-full"
              dataSource={pageChunks}
              locale={{ emptyText: busy ? '处理中，自动刷新状态…' : '暂无切片。请等待解析完成，或点击「重新计算」。' }}
              renderItem={(chunk, index) => {
                const globalIndex = (currentPage - 1) * pageSize + index
                const prev = globalIndex > 0 ? previewChunks[globalIndex - 1] : undefined
                const overlapChars = prev ? overlapLength(prev.content, chunk.content) : 0
                return (
                  <List.Item>
                    <div className="w-full">
                      <div className="mb-2 flex items-center justify-between">
                        <Typography.Text>#{chunk.chunk_index ?? globalIndex}</Typography.Text>
                        <Typography.Text type="secondary">
                          {chunk.char_count ?? chunk.content.length} 字
                          {overlapChars ? ` · 与上一段重叠 ${overlapChars} 字` : ''}
                        </Typography.Text>
                      </div>
                      <Typography.Paragraph className="whitespace-pre-wrap" style={{ marginBottom: 0 }}>
                        {chunk.content}
                      </Typography.Paragraph>
                    </div>
                  </List.Item>
                )
              }}
            />
            </Spin>
          </div>
          {previewChunks.length > 0 ? (
            <Pagination
              className="mt-4 shrink-0"
              align="end"
              current={currentPage}
              pageSize={pageSize}
              total={previewChunks.length}
              showSizeChanger
              pageSizeOptions={[10, 20, 50]}
              showTotal={(total) => `共 ${total} 条`}
              onChange={(nextPage, nextSize) => {
                setPageSize(nextSize)
                setPage(nextSize === pageSize ? nextPage : 1)
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 justify-end">
        <Space>
          <Button disabled={!hasSourceText || busy || previewMut.isPending} onClick={() => previewMut.mutate()}>
            {previewMut.isPending ? '计算中…' : '重新计算'}
          </Button>
          <Button
            type="primary"
            disabled={!canEdit || busy || importMut.isPending || previewChunks.length === 0}
            onClick={() => importMut.mutate()}
          >
            {importMut.isPending ? '导入中…' : '保存并导入'}
          </Button>
        </Space>
      </div>
    </div>
  )
}
