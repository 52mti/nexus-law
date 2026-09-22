import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Button, DatePicker, Input, InputNumber, Slider, Space, Tag, message } from 'antd'
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
import type { ChunkItem } from '@/lib/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/knowledge/documents/$id')({
  component: DocumentChunksPage,
})

const DEFAULT_SEPARATORS = ['\\n\\n', '\\n', '。', '；', ' ']

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
  const parentRef = useRef<HTMLDivElement>(null)
  const [chunkSize, setChunkSize] = useState(800)
  const [overlap, setOverlap] = useState(120)
  const [separatorsText, setSeparatorsText] = useState(DEFAULT_SEPARATORS.join('\n'))
  const [title, setTitle] = useState('')
  const [lawLevel, setLawLevel] = useState('')
  const [region, setRegion] = useState('')
  const [effectiveAt, setEffectiveAt] = useState<Dayjs | null>(null)
  const [expiredAt, setExpiredAt] = useState<Dayjs | null>(null)
  const [previewChunks, setPreviewChunks] = useState<ChunkItem[]>([])
  const [selected, setSelected] = useState(0)
  const [seeded, setSeeded] = useState(false)
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
    }
  }, [savedChunks, previewChunks.length])

  const virtualizer = useVirtualizer({
    count: previewChunks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 168,
    overscan: 8,
    getItemKey: (index) => previewChunks[index]?.id ?? previewChunks[index]?.chunk_index ?? index,
  })

  const safeOverlap = Math.min(overlap, Math.max(chunkSize - 1, 0))

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
      setSelected(0)
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

  return (
    <div className="chunk-studio -mx-4 -mb-4 mt-[-1rem] flex h-[calc(100svh-64px)] flex-col overflow-hidden bg-[#1b2433] text-slate-200 md:-mx-6 md:-mb-6 md:mt-[-1.5rem]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-cyan-400/20 bg-[#151c28] px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-slate-100">
              {doc?.title || doc?.source || '切片预览'}
            </h1>
            {doc ? <Tag color="cyan">{doc.status}</Tag> : null}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {doc?.error_message || '中控调节切片参数，右侧预览高亮重叠区；底部重新计算后保存导入'}
          </p>
        </div>
        <Space wrap>
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
          {doc?.status === 'published' ? (
            <Button onClick={() => unpublishMut.mutate()}>下架</Button>
          ) : null}
        </Space>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="min-h-0 w-full max-lg:max-h-[40%] overflow-auto border-b border-white/10 lg:w-[35%] lg:max-h-none lg:shrink-0 lg:border-b-0 lg:border-r lg:border-white/10">
          <div className="space-y-6 p-4">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-cyan-300">切片参数</h2>
              <p className="mt-1 text-xs text-slate-400">
                RecursiveCharacterTextSplitter · 原文 {doc?.extracted_text_chars ?? 0} 字
              </p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">切片大小</span>
                <InputNumber
                  min={50}
                  max={8000}
                  step={10}
                  value={chunkSize}
                  disabled={busy}
                  onChange={(value) => setChunkSize(Number(value) || 50)}
                />
              </div>
              <Slider
                min={50}
                max={4000}
                step={10}
                value={Math.min(chunkSize, 4000)}
                disabled={busy}
                onChange={setChunkSize}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-300">重叠长度</span>
                <InputNumber
                  min={0}
                  max={Math.max(chunkSize - 1, 0)}
                  step={5}
                  value={safeOverlap}
                  disabled={busy}
                  onChange={(value) => setOverlap(Number(value) || 0)}
                />
              </div>
              <Slider
                min={0}
                max={Math.max(chunkSize - 1, 0)}
                step={5}
                value={safeOverlap}
                disabled={busy}
                onChange={setOverlap}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-slate-300">拆分符号</span>
                <Button type="link" size="small" disabled={busy} onClick={() => setSeparatorsText(DEFAULT_SEPARATORS.join('\n'))}>
                  恢复默认
                </Button>
              </div>
              <Input.TextArea
                className="font-mono"
                rows={6}
                value={separatorsText}
                disabled={busy}
                onChange={(e) => setSeparatorsText(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">每行一个分隔符，可用 \n 表示换行，将按优先级递归切分</p>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide text-emerald-300">元数据提取</h2>
              <div>
                <div className="mb-1 text-sm text-slate-300">标题</div>
                <Input value={title} disabled={!canEdit || busy} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-sm text-slate-300">效力层级</div>
                <Input
                  value={lawLevel}
                  disabled={!canEdit || busy}
                  onChange={(e) => setLawLevel(e.target.value)}
                  placeholder="法律 / 行政法规 / 地方法规"
                />
              </div>
              <div>
                <div className="mb-1 text-sm text-slate-300">地域</div>
                <Input value={region} disabled={!canEdit || busy} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm text-slate-300">生效时间</div>
                  <DatePicker
                    className="w-full"
                    showTime
                    value={effectiveAt}
                    disabled={!canEdit || busy}
                    onChange={setEffectiveAt}
                  />
                </div>
                <div>
                  <div className="mb-1 text-sm text-slate-300">失效时间</div>
                  <DatePicker
                    className="w-full"
                    showTime
                    value={expiredAt}
                    disabled={!canEdit || busy}
                    onChange={setExpiredAt}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 w-full flex-1 flex-col lg:min-w-[50%] lg:flex-1">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-slate-400">
            <span>
              预览 {stats.count} 段 · {stats.chars} 字
              {previewMeta ? ` · 参数 ${previewMeta.chunk_size}/${previewMeta.chunk_overlap}` : ''}
            </span>
            <span className="text-cyan-300/80">亮青标题 · 翠绿重叠</span>
          </div>
          {busy ? (
            <p className="p-4 text-sm text-slate-400">处理中，自动刷新状态…</p>
          ) : (
            <div ref={parentRef} className="min-h-0 flex-1 overflow-auto px-3 py-3">
              {previewChunks.length === 0 ? (
                <p className="text-sm text-slate-400">暂无切片。请等待解析完成，或点击底部「重新计算」。</p>
              ) : (
                <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                  {virtualizer.getVirtualItems().map((row) => {
                    const chunk = previewChunks[row.index]
                    const prev = previewChunks[row.index - 1]
                    const overlapChars = prev ? overlapLength(prev.content, chunk.content) : 0
                    const overlapText = overlapChars ? chunk.content.slice(0, overlapChars) : ''
                    const rest = chunk.content.slice(overlapChars)
                    const active = selected === row.index
                    return (
                      <article
                        key={row.key}
                        data-index={row.index}
                        ref={virtualizer.measureElement}
                        className="absolute top-0 left-0 w-full pb-3"
                        style={{ transform: `translateY(${row.start}px)` }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelected(row.index)}
                          className={cn(
                            'w-full rounded-lg border px-3 py-3 text-left transition-colors',
                            active
                              ? 'border-emerald-400/70 bg-[#132433] shadow-[0_0_24px_rgba(52,211,153,0.12)]'
                              : 'border-slate-600/70 bg-[#202a38] hover:border-cyan-400/50',
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="font-mono text-cyan-300">#{chunk.chunk_index ?? row.index}</span>
                            <span className="text-slate-400">{chunk.char_count ?? chunk.content.length} 字</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
                            {overlapText ? (
                              <span className="rounded-sm bg-emerald-400/20 text-emerald-200">{overlapText}</span>
                            ) : null}
                            {rest}
                          </p>
                        </button>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-cyan-400/20 bg-[#151c28] px-4 py-3">
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
      </footer>
    </div>
  )
}
