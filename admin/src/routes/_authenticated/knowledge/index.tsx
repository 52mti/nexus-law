import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  createDataset,
  deleteDataset,
  deleteDocument,
  listDatasets,
  listDocuments,
  unpublishDocument,
  updateDataset,
  uploadDocument,
} from '@/api/knowledge'
import { EmptyRow, Field, PageHeader, PaginationBar } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { DatasetItem } from '@/lib/types'
import { compactParams, formatDate } from '@/lib/utils'

const DOC_STATUSES = ['uploading', 'parsing', 'draft', 'publishing', 'published', 'failed', 'discarded']

function KnowledgePage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('datasets')
  const [dsKeyword, setDsKeyword] = useState('')
  const [dsCurrent, setDsCurrent] = useState(1)
  const [dsOpen, setDsOpen] = useState(false)
  const [editing, setEditing] = useState<DatasetItem | null>(null)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')
  const [visibility, setVisibility] = useState('all')

  const [docKeyword, setDocKeyword] = useState('')
  const [docStatus, setDocStatus] = useState('all')
  const [docDataset, setDocDataset] = useState('all')
  const [docCurrent, setDocCurrent] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadDataset, setUploadDataset] = useState('')
  const [uploadTitle, setUploadTitle] = useState('')
  const [lawLevel, setLawLevel] = useState('')
  const [docRegion, setDocRegion] = useState('')

  const datasetsQuery = useQuery({
    queryKey: ['admin-datasets', dsKeyword, dsCurrent],
    queryFn: () => listDatasets(compactParams({ keyword: dsKeyword, current: dsCurrent, size: 20 })),
  })
  const datasetsAllQuery = useQuery({
    queryKey: ['admin-datasets-all'],
    queryFn: () => listDatasets({ current: 1, size: 100 }),
  })
  const documentsQuery = useQuery({
    queryKey: ['admin-documents', docKeyword, docStatus, docDataset, docCurrent],
    queryFn: () =>
      listDocuments(
        compactParams({
          keyword: docKeyword,
          status: docStatus === 'all' ? undefined : docStatus,
          dataset_id: docDataset === 'all' ? undefined : docDataset,
          current: docCurrent,
          size: 20,
        }),
      ),
  })
  const datasets = datasetsQuery.data?.records || []
  const allDatasets = datasetsAllQuery.data?.records || datasets
  const documents = documentsQuery.data?.records || []

  const saveDs = useMutation({
    mutationFn: () =>
      editing
        ? updateDataset({ id: editing.id, title, description, region, visibility })
        : createDataset({ name, title, description, region, visibility }),
    onSuccess: () => {
      toast.success(editing ? '知识库已更新' : '知识库已创建')
      setDsOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-datasets'] })
    },
  })
  const deleteDs = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      toast.success('知识库已删除')
      void queryClient.invalidateQueries({ queryKey: ['admin-datasets'] })
    },
  })
  const uploadMut = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('请选择文件')
      const form = new FormData()
      form.append('file', file)
      form.append('dataset_id', uploadDataset)
      if (uploadTitle) form.append('title', uploadTitle)
      if (lawLevel) form.append('law_level', lawLevel)
      if (docRegion) form.append('region', docRegion)
      return uploadDocument(form)
    },
    onSuccess: () => {
      toast.success('已上传，正在解析')
      setUploadOpen(false)
      setFile(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
    },
  })
  const unpublishMut = useMutation({
    mutationFn: unpublishDocument,
    onSuccess: () => {
      toast.success('已下架')
      void queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
    },
  })
  const deleteDocMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      toast.success('已删除')
      void queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
    },
  })

  function openCreateDs() {
    setEditing(null)
    setName('')
    setTitle('')
    setDescription('')
    setRegion('')
    setVisibility('all')
    setDsOpen(true)
  }

  function openEditDs(item: DatasetItem) {
    setEditing(item)
    setName(item.name)
    setTitle(item.title || '')
    setDescription(item.description || '')
    setRegion(item.region || '')
    setVisibility(item.visibility || 'all')
    setDsOpen(true)
  }

  return (
    <div>
      <PageHeader title="知识库" description="上传 → 切片审核 → 发布 / 下架" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="datasets">数据集</TabsTrigger>
          <TabsTrigger value="documents">文档</TabsTrigger>
        </TabsList>
        <TabsContent value="datasets">
          <div className="mb-4 flex gap-2">
            <Input
              className="w-56"
              placeholder="搜索名称"
              value={dsKeyword}
              onChange={(e) => { setDsKeyword(e.target.value); setDsCurrent(1) }}
            />
            <Button onClick={openCreateDs}>新建数据集</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>地域</TableHead>
                <TableHead>可见性</TableHead>
                <TableHead>文档数</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.length === 0 ? (
                <EmptyRow colSpan={6} />
              ) : (
                datasets.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.title || '—'}</TableCell>
                    <TableCell>{item.region || '—'}</TableCell>
                    <TableCell>{item.visibility || '—'}</TableCell>
                    <TableCell>{item.document_count ?? '—'}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDs(item)}>编辑</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteDs.mutate(item.id)}>删除</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar
            current={datasetsQuery.data?.current || dsCurrent}
            pages={datasetsQuery.data?.pages || 1}
            total={datasetsQuery.data?.total || 0}
            onChange={setDsCurrent}
          />
        </TabsContent>
        <TabsContent value="documents">
          <div className="mb-4 flex flex-wrap gap-2">
            <Input
              className="w-48"
              placeholder="关键词"
              value={docKeyword}
              onChange={(e) => { setDocKeyword(e.target.value); setDocCurrent(1) }}
            />
            <Select value={docDataset} onValueChange={(value) => { setDocDataset(value); setDocCurrent(1) }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="数据集" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部数据集</SelectItem>
                {allDatasets.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.title || item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={docStatus} onValueChange={(value) => { setDocStatus(value); setDocCurrent(1) }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {DOC_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => {
              setUploadDataset(allDatasets[0]?.id || '')
              setUploadOpen(true)
            }}>上传文档</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>切片</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <EmptyRow colSpan={6} />
              ) : (
                documents.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title || item.source || item.id}</TableCell>
                    <TableCell className="max-w-40 truncate">{item.source}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'published' ? 'success' : item.status === 'failed' ? 'destructive' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.chunk_count ?? 0}</TableCell>
                    <TableCell>{formatDate(item.updated_at)}</TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/knowledge/documents/$id" params={{ id: item.id }}>切片</Link>
                      </Button>
                      {item.status === 'published' ? (
                        <Button size="sm" variant="outline" onClick={() => unpublishMut.mutate(item.id)}>下架</Button>
                      ) : null}
                      <Button size="sm" variant="destructive" onClick={() => deleteDocMut.mutate(item.id)}>删除</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationBar
            current={documentsQuery.data?.current || docCurrent}
            pages={documentsQuery.data?.pages || 1}
            total={documentsQuery.data?.total || 0}
            onChange={setDocCurrent}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dsOpen} onOpenChange={setDsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑数据集' : '新建数据集'}</DialogTitle>
          </DialogHeader>
          {!editing ? (
            <Field label="名称（Weaviate class，须以大写字母开头）">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="NexusLawDocuments" />
            </Field>
          ) : null}
          <Field label="标题">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="描述">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="地域">
            <Input value={region} onChange={(e) => setRegion(e.target.value)} />
          </Field>
          <Field label="可见性">
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="lawyer">lawyer</SelectItem>
                <SelectItem value="internal">internal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDsOpen(false)}>取消</Button>
            <Button disabled={saveDs.isPending} onClick={() => saveDs.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传文档</DialogTitle>
          </DialogHeader>
          <Field label="数据集">
            <Select value={uploadDataset} onValueChange={setUploadDataset}>
              <SelectTrigger><SelectValue placeholder="选择数据集" /></SelectTrigger>
              <SelectContent>
                {allDatasets.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.title || item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="文件">
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Field>
          <Field label="标题">
            <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
          </Field>
          <Field label="效力级别">
            <Input value={lawLevel} onChange={(e) => setLawLevel(e.target.value)} />
          </Field>
          <Field label="地域">
            <Input value={docRegion} onChange={(e) => setDocRegion(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>取消</Button>
            <Button disabled={uploadMut.isPending || !file || !uploadDataset} onClick={() => uploadMut.mutate()}>
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/knowledge/')({
  component: KnowledgePage,
})
