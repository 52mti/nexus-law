import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Button, Input, Modal, Select, Space, Table, Tabs, Tag, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
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
import { Field, PageHeader, tablePagination } from '@/components/page'
import type { DatasetItem, DocumentItem } from '@/lib/types'
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
      message.success(editing ? '知识库已更新' : '知识库已创建')
      setDsOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-datasets'] })
    },
  })
  const deleteDs = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      message.success('知识库已删除')
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
      message.success('已上传，正在解析')
      setUploadOpen(false)
      setFile(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
    },
  })
  const unpublishMut = useMutation({
    mutationFn: unpublishDocument,
    onSuccess: () => {
      message.success('已下架')
      void queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
    },
  })
  const deleteDocMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      message.success('已删除')
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

  const datasetColumns: TableColumnsType<DatasetItem> = [
    { title: '名称', dataIndex: 'name' },
    { title: '标题', dataIndex: 'title', render: (value) => value || '—' },
    { title: '地域', dataIndex: 'region', render: (value) => value || '—' },
    { title: '可见性', dataIndex: 'visibility', render: (value) => value || '—' },
    { title: '文档数', dataIndex: 'document_count', render: (value) => value ?? '—' },
    {
      title: '操作',
      render: (_, item) => (
        <Space>
          <Button size="small" onClick={() => openEditDs(item)}>
            编辑
          </Button>
          <Button size="small" danger onClick={() => deleteDs.mutate(item.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const documentColumns: TableColumnsType<DocumentItem> = [
    { title: '标题', render: (_, item) => item.title || item.source || item.id },
    { title: '来源', dataIndex: 'source', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value) => (
        <Tag color={value === 'published' ? 'success' : value === 'failed' ? 'error' : 'default'}>{value}</Tag>
      ),
    },
    { title: '切片', dataIndex: 'chunk_count', render: (value) => value ?? 0 },
    { title: '更新时间', dataIndex: 'updated_at', render: (value) => formatDate(value) },
    {
      title: '操作',
      width: 220,
      render: (_, item) => (
        <Space wrap>
          <Link to="/knowledge/documents/$id" params={{ id: item.id }}>
            <Button size="small">切片</Button>
          </Link>
          {item.status === 'published' ? (
            <Button size="small" onClick={() => unpublishMut.mutate(item.id)}>
              下架
            </Button>
          ) : null}
          <Button size="small" danger onClick={() => deleteDocMut.mutate(item.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="知识库" description="上传 → 切片审核 → 发布 / 下架" />
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'datasets',
            label: '数据集',
            children: (
              <>
                <Space className="mb-4" wrap>
                  <Input
                    style={{ width: 224 }}
                    placeholder="搜索名称"
                    value={dsKeyword}
                    onChange={(e) => {
                      setDsKeyword(e.target.value)
                      setDsCurrent(1)
                    }}
                  />
                  <Button type="primary" onClick={openCreateDs}>
                    新建数据集
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={datasetsQuery.isLoading}
                  columns={datasetColumns}
                  dataSource={datasets}
                  pagination={tablePagination(datasetsQuery.data, dsCurrent, setDsCurrent)}
                />
              </>
            ),
          },
          {
            key: 'documents',
            label: '文档',
            children: (
              <>
                <Space className="mb-4" wrap>
                  <Input
                    style={{ width: 192 }}
                    placeholder="关键词"
                    value={docKeyword}
                    onChange={(e) => {
                      setDocKeyword(e.target.value)
                      setDocCurrent(1)
                    }}
                  />
                  <Select
                    style={{ width: 192 }}
                    value={docDataset}
                    onChange={(value) => {
                      setDocDataset(value)
                      setDocCurrent(1)
                    }}
                    options={[
                      { value: 'all', label: '全部数据集' },
                      ...allDatasets.map((item) => ({ value: item.id, label: item.title || item.name })),
                    ]}
                  />
                  <Select
                    style={{ width: 144 }}
                    value={docStatus}
                    onChange={(value) => {
                      setDocStatus(value)
                      setDocCurrent(1)
                    }}
                    options={[
                      { value: 'all', label: '全部状态' },
                      ...DOC_STATUSES.map((status) => ({ value: status, label: status })),
                    ]}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      setUploadDataset(allDatasets[0]?.id || '')
                      setUploadOpen(true)
                    }}
                  >
                    上传文档
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={documentsQuery.isLoading}
                  columns={documentColumns}
                  dataSource={documents}
                  pagination={tablePagination(documentsQuery.data, docCurrent, setDocCurrent)}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? '编辑数据集' : '新建数据集'}
        open={dsOpen}
        onCancel={() => setDsOpen(false)}
        onOk={() => saveDs.mutate()}
        confirmLoading={saveDs.isPending}
      >
        {!editing ? (
          <Field label="名称（Weaviate class，须以大写字母开头）">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="NexusLawDocuments" />
          </Field>
        ) : null}
        <Field label="标题">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="描述">
          <Input.TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="地域">
          <Input value={region} onChange={(e) => setRegion(e.target.value)} />
        </Field>
        <Field label="可见性">
          <Select
            className="w-full"
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: 'all', label: 'all' },
              { value: 'lawyer', label: 'lawyer' },
              { value: 'internal', label: 'internal' },
            ]}
          />
        </Field>
      </Modal>

      <Modal
        title="上传文档"
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onOk={() => uploadMut.mutate()}
        confirmLoading={uploadMut.isPending}
        okButtonProps={{ disabled: !file || !uploadDataset }}
      >
        <Field label="数据集">
          <Select
            className="w-full"
            value={uploadDataset}
            onChange={setUploadDataset}
            options={allDatasets.map((item) => ({ value: item.id, label: item.title || item.name }))}
          />
        </Field>
        <Field label="文件">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
      </Modal>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/knowledge/')({
  component: KnowledgePage,
})
