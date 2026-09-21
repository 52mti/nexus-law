import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  getDocumentDetail,
  listDocumentChunks,
  publishDocument,
  unpublishDocument,
  updateDocumentChunks,
} from '@/api/knowledge'
import { Field, PageHeader } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_authenticated/knowledge/documents/$id')({
  component: DocumentChunksPage,
})

function DocumentChunksPage() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, string>>({})

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
  const chunks = chunksQuery.data?.records || []
  const busy = doc?.status === 'uploading' || doc?.status === 'parsing' || doc?.status === 'publishing'
  const canEdit = doc?.status === 'draft' || doc?.status === 'failed'

  const saveMut = useMutation({
    mutationFn: () =>
      updateDocumentChunks(
        id,
        chunks.map((chunk) => ({
          id: chunk.id,
          content: drafts[chunk.id] ?? chunk.content,
        })),
      ),
    onSuccess: () => {
      toast.success('切片已保存')
      void queryClient.invalidateQueries({ queryKey: ['admin-chunks', id] })
    },
  })
  const publishMut = useMutation({
    mutationFn: () => publishDocument(id),
    onSuccess: () => {
      toast.success('已提交发布')
      void queryClient.invalidateQueries({ queryKey: ['admin-document', id] })
    },
  })
  const unpublishMut = useMutation({
    mutationFn: () => unpublishDocument(id),
    onSuccess: () => {
      toast.success('已下架')
      void queryClient.invalidateQueries({ queryKey: ['admin-document', id] })
    },
  })

  return (
    <div>
      <PageHeader
        title={doc?.title || doc?.source || '文档切片'}
        description={doc?.error_message || '发布前可修订切片；已发布文档需先下架'}
      >
        <Button variant="outline" asChild>
          <Link to="/knowledge">返回知识库</Link>
        </Button>
        {canEdit ? (
          <>
            <Button variant="outline" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
              保存切片
            </Button>
            <Button disabled={publishMut.isPending} onClick={() => publishMut.mutate()}>
              发布
            </Button>
          </>
        ) : null}
        {doc?.status === 'published' ? (
          <Button variant="outline" onClick={() => unpublishMut.mutate()}>
            下架
          </Button>
        ) : null}
      </PageHeader>
      {doc ? <Badge className="mb-4">{doc.status}</Badge> : null}
      {busy ? <p className="text-sm text-muted-foreground">处理中，自动刷新状态…</p> : null}
      <div className="space-y-4">
        {chunks.map((chunk) => (
          <Field key={chunk.id} label={`切片 #${chunk.chunk_index}（${chunk.char_count ?? 0} 字）`}>
            <Textarea
              className="min-h-28"
              value={drafts[chunk.id] ?? chunk.content}
              readOnly={!canEdit}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [chunk.id]: e.target.value }))}
            />
          </Field>
        ))}
        {!busy && chunks.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无切片，请等待解析完成或检查失败原因。</p>
        ) : null}
      </div>
    </div>
  )
}
