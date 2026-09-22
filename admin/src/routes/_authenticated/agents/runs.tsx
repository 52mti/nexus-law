import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Button, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getAgentRunDetail, listAgentRuns, listAgents } from '@/api/runtime'
import { PageHeader, tablePagination } from '@/components/page'
import type { AgentRunItem } from '@/lib/types'
import { compactParams, formatDate } from '@/lib/utils'

function pct(value: boolean) {
  return value ? '是' : '否'
}

function formatNodeValue(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function NodeIO({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <Typography.Text type="secondary" className="text-xs">
        {label}
      </Typography.Text>
      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-black/5 p-2 text-xs leading-5 dark:bg-white/10">
        {formatNodeValue(value)}
      </pre>
    </div>
  )
}

function AgentRunsPage() {
  const [agentId, setAgentId] = useState('all')
  const [retrieval, setRetrieval] = useState('all')
  const [error, setError] = useState('all')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [current, setCurrent] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)

  const agentsQuery = useQuery({
    queryKey: ['admin-agents-all'],
    queryFn: () => listAgents({ current: 1, size: 100 }),
  })
  const query = useQuery({
    queryKey: ['admin-agent-runs', agentId, retrieval, error, startAt, endAt, current],
    queryFn: () =>
      listAgentRuns(
        compactParams({
          agent_id: agentId === 'all' ? undefined : agentId,
          retrieval_hit: retrieval === 'all' ? undefined : retrieval === 'hit',
          error: error === 'all' ? undefined : error === 'yes',
          start_at: startAt || undefined,
          end_at: endAt || undefined,
          current,
          size: 20,
        }),
      ),
  })
  const detailQuery = useQuery({
    queryKey: ['admin-agent-run', detailId],
    queryFn: () => getAgentRunDetail(detailId!),
    enabled: !!detailId,
  })
  const records = query.data?.records || []
  const agents = agentsQuery.data?.records || []
  const detail = detailQuery.data

  const columns: TableColumnsType<AgentRunItem> = [
    { title: '时间', dataIndex: 'created_at', render: (value) => formatDate(value) },
    { title: 'Agent', render: (_, item) => item.agent_name || item.agent_code || '—' },
    {
      title: '耗时',
      dataIndex: 'latency_ms',
      render: (value) => (value != null ? `${Math.round(value)} ms` : '—'),
    },
    {
      title: '迭代',
      render: (_, item) => (
        <span>
          {item.iterations}
          {item.hit_max_iterations ? <Tag className="ml-1">打满</Tag> : null}
        </span>
      ),
    },
    { title: '检索', render: (_, item) => (item.used_search ? pct(item.retrieval_hit) : '未检索') },
    { title: '工具', dataIndex: 'used_tools', render: (value) => pct(value) },
    { title: '错误', dataIndex: 'error_code', render: (value) => value || '—' },
    {
      title: '操作',
      render: (_, item) => (
        <Button size="small" onClick={() => setDetailId(item.id)}>
          时间线
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="运行记录" description="每次问答一条轨迹，用于对照提示词、工具与知识库">
        <Link to="/agents">
          <Button>返回 Agent</Button>
        </Link>
        <Link to="/agents/stats">
          <Button>统计</Button>
        </Link>
      </PageHeader>
      <Space wrap className="mb-4">
        <Select
          style={{ width: 192 }}
          value={agentId}
          onChange={(value) => {
            setAgentId(value)
            setCurrent(1)
          }}
          options={[
            { value: 'all', label: '全部 Agent' },
            ...agents.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          style={{ width: 160 }}
          value={retrieval}
          onChange={(value) => {
            setRetrieval(value)
            setCurrent(1)
          }}
          options={[
            { value: 'all', label: '检索命中：全部' },
            { value: 'hit', label: '有命中' },
            { value: 'miss', label: '未命中' },
          ]}
        />
        <Select
          style={{ width: 144 }}
          value={error}
          onChange={(value) => {
            setError(value)
            setCurrent(1)
          }}
          options={[
            { value: 'all', label: '错误：全部' },
            { value: 'yes', label: '有错误' },
            { value: 'no', label: '无错误' },
          ]}
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

      <Modal
        title="运行时间线"
        open={!!detailId}
        onCancel={() => setDetailId(null)}
        footer={null}
        width={768}
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <Typography.Text type="secondary">
              {detail.agent_name || detail.agent_code || '未绑定 Agent'} · {detail.model || '—'} ·{' '}
              {detail.latency_ms != null ? `${Math.round(detail.latency_ms)} ms` : '—'}
            </Typography.Text>
            <ol className="space-y-3">
              {(detail.timeline || []).map((event, index) => (
                <li key={`${event.type}-${index}`} className="space-y-2 rounded-md border px-3 py-3">
                  <Space wrap>
                    <span className="font-medium">
                      {event.type === 'agent' ? 'agent' : `tool(${event.name || 'unknown'})`}
                    </span>
                    <Typography.Text type="secondary">
                      {event.latency_ms != null ? `${Math.round(event.latency_ms)} ms` : '耗时 —'}
                    </Typography.Text>
                    {event.empty_retrieval ? <Tag>空检索</Tag> : null}
                  </Space>
                  <NodeIO label="输入状态" value={event.input ?? event.args} />
                  <NodeIO label="输出状态" value={event.output} />
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <Typography.Text type="secondary">加载中…</Typography.Text>
        )}
      </Modal>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/agents/runs')({
  component: AgentRunsPage,
})
