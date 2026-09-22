import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Input, Modal, Space, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getAuditDetail, listAudits } from '@/api/audit'
import { PageHeader, tablePagination } from '@/components/page'
import type { AuditItem } from '@/lib/types'
import { compactParams, formatDate } from '@/lib/utils'

function AuditPage() {
  const [adminId, setAdminId] = useState('')
  const [action, setAction] = useState('')
  const [targetType, setTargetType] = useState('')
  const [targetId, setTargetId] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [current, setCurrent] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['admin-audits', adminId, action, targetType, targetId, startAt, endAt, current],
    queryFn: () =>
      listAudits(
        compactParams({
          admin_id: adminId,
          action,
          target_type: targetType,
          target_id: targetId,
          start_at: startAt || undefined,
          end_at: endAt || undefined,
          current,
          size: 20,
        }),
      ),
  })
  const detailQuery = useQuery({
    queryKey: ['admin-audit', detailId],
    queryFn: () => getAuditDetail(detailId!),
    enabled: !!detailId,
  })
  const records = query.data?.records || []

  const columns: TableColumnsType<AuditItem> = [
    { title: '时间', dataIndex: 'created_at', render: (value) => formatDate(value) },
    {
      title: '操作人',
      render: (_, item) => item.admin?.nickname || item.admin?.phone || item.admin_id || '—',
    },
    { title: '动作', dataIndex: 'action' },
    {
      title: '对象',
      render: (_, item) => `${item.target_type || '—'} ${item.target_id || ''}`,
    },
    {
      title: '操作',
      render: (_, item) => (
        <Button size="small" onClick={() => setDetailId(item.id)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="操作日志" description="管理员关键操作留痕" />
      <Space wrap className="mb-4">
        <Input
          style={{ width: 176 }}
          placeholder="操作人 ID"
          value={adminId}
          onChange={(e) => {
            setAdminId(e.target.value)
            setCurrent(1)
          }}
        />
        <Input
          style={{ width: 160 }}
          placeholder="action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setCurrent(1)
          }}
        />
        <Input
          style={{ width: 144 }}
          placeholder="target_type"
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value)
            setCurrent(1)
          }}
        />
        <Input
          style={{ width: 176 }}
          placeholder="target_id"
          value={targetId}
          onChange={(e) => {
            setTargetId(e.target.value)
            setCurrent(1)
          }}
        />
        <Input
          type="datetime-local"
          value={startAt}
          onChange={(e) => {
            setStartAt(e.target.value)
            setCurrent(1)
          }}
        />
        <Input
          type="datetime-local"
          value={endAt}
          onChange={(e) => {
            setEndAt(e.target.value)
            setCurrent(1)
          }}
        />
      </Space>
      <Table
        rowKey="id"
        loading={query.isLoading}
        columns={columns}
        dataSource={records}
        pagination={tablePagination(query.data, current, setCurrent)}
      />
      <Modal title="日志详情" open={!!detailId} onCancel={() => setDetailId(null)} footer={null} width={720}>
        <pre className="max-h-96 overflow-auto rounded-md bg-black/5 p-3 text-xs dark:bg-white/10">
          {JSON.stringify(detailQuery.data ?? {}, null, 2)}
        </pre>
      </Modal>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/audit/')({
  component: AuditPage,
})
