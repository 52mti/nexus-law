import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Button, Card, Col, Input, Row, Select, Space, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { getAgentRunStats, listAgents } from '@/api/runtime'
import { PageHeader } from '@/components/page'
import { compactParams } from '@/lib/utils'

function rate(value: number | null | undefined) {
  if (value == null) return '—'
  return `${(value * 100).toFixed(1)}%`
}

function AgentStatsPage() {
  const [agentId, setAgentId] = useState('all')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  const agentsQuery = useQuery({
    queryKey: ['admin-agents-all'],
    queryFn: () => listAgents({ current: 1, size: 100 }),
  })
  const statsQuery = useQuery({
    queryKey: ['admin-agent-run-stats', agentId, startAt, endAt],
    queryFn: () =>
      getAgentRunStats(
        compactParams({
          agent_id: agentId === 'all' ? undefined : agentId,
          start_at: startAt || undefined,
          end_at: endAt || undefined,
        }),
      ),
  })
  const agents = agentsQuery.data?.records || []
  const stats = statsQuery.data
  const rows = stats?.by_agent || []

  const columns: TableColumnsType<(typeof rows)[number]> = [
    { title: 'Agent', render: (_, item) => item.agent_name || item.agent_code || '未绑定' },
    { title: '次数', dataIndex: 'total' },
    { title: '空检索率', dataIndex: 'empty_retrieval_rate', render: (value) => rate(value) },
    { title: '工具调用率', dataIndex: 'tool_call_rate', render: (value) => rate(value) },
    {
      title: '平均耗时',
      dataIndex: 'avg_latency_ms',
      render: (value) => (value != null ? `${Math.round(value)} ms` : '—'),
    },
    { title: '打满迭代', dataIndex: 'hit_max_iterations_rate', render: (value) => rate(value) },
  ]

  return (
    <div>
      <PageHeader title="运行统计" description="空检索、工具调用、耗时与打满迭代，用于对照优化点">
        <Link to="/agents">
          <Button>返回 Agent</Button>
        </Link>
        <Link to="/agents/runs">
          <Button>运行记录</Button>
        </Link>
      </PageHeader>
      <Space wrap className="mb-4">
        <Select
          style={{ width: 192 }}
          value={agentId}
          onChange={setAgentId}
          options={[
            { value: 'all', label: '全部 Agent' },
            ...agents.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
      </Space>
      <Row gutter={12} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="空检索率">
            {rate(stats?.empty_retrieval_rate)}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="工具调用率">
            {rate(stats?.tool_call_rate)}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="平均耗时">
            {stats?.avg_latency_ms != null ? `${Math.round(stats.avg_latency_ms)} ms` : '—'}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" title="打满迭代比例">
            {rate(stats?.hit_max_iterations_rate)}
          </Card>
        </Col>
      </Row>
      <Table
        rowKey={(item) => item.agent_id || 'none'}
        loading={statsQuery.isLoading}
        columns={columns}
        dataSource={rows}
        pagination={false}
      />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/agents/stats')({
  component: AgentStatsPage,
})
