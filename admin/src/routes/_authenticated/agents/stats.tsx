import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getAgentRunStats, listAgents } from '@/api/runtime'
import { EmptyRow, PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

  return (
    <div>
      <PageHeader title="运行统计" description="空检索、工具调用、耗时与打满迭代，用于对照优化点">
        <Button variant="outline" asChild>
          <Link to="/agents">返回 Agent</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/agents/runs">运行记录</Link>
        </Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={agentId} onValueChange={setAgentId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部 Agent</SelectItem>
            {agents.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">空检索率</div>
          <div className="mt-1 text-2xl font-semibold">{rate(stats?.empty_retrieval_rate)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">工具调用率</div>
          <div className="mt-1 text-2xl font-semibold">{rate(stats?.tool_call_rate)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">平均耗时</div>
          <div className="mt-1 text-2xl font-semibold">
            {stats?.avg_latency_ms != null ? `${Math.round(stats.avg_latency_ms)} ms` : '—'}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">打满迭代比例</div>
          <div className="mt-1 text-2xl font-semibold">{rate(stats?.hit_max_iterations_rate)}</div>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>次数</TableHead>
            <TableHead>空检索率</TableHead>
            <TableHead>工具调用率</TableHead>
            <TableHead>平均耗时</TableHead>
            <TableHead>打满迭代</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(stats?.by_agent || []).length === 0 ? (
            <EmptyRow colSpan={6} />
          ) : (
            (stats?.by_agent || []).map((item) => (
              <TableRow key={item.agent_id || 'none'}>
                <TableCell>{item.agent_name || item.agent_code || '未绑定'}</TableCell>
                <TableCell>{item.total}</TableCell>
                <TableCell>{rate(item.empty_retrieval_rate)}</TableCell>
                <TableCell>{rate(item.tool_call_rate)}</TableCell>
                <TableCell>{item.avg_latency_ms != null ? `${Math.round(item.avg_latency_ms)} ms` : '—'}</TableCell>
                <TableCell>{rate(item.hit_max_iterations_rate)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/agents/stats')({
  component: AgentStatsPage,
})
