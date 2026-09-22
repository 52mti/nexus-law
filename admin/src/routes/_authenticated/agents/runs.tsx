import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getAgentRunDetail, listAgentRuns, listAgents } from '@/api/runtime'
import { EmptyRow, PageHeader, PaginationBar } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import { compactParams, formatDate } from '@/lib/utils'

function pct(value: boolean) {
  return value ? '是' : '否'
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

  return (
    <div>
      <PageHeader title="运行记录" description="每次问答一条轨迹，用于对照提示词、工具与知识库">
        <Button variant="outline" asChild>
          <Link to="/agents">返回 Agent</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/agents/stats">统计</Link>
        </Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={agentId} onValueChange={(value) => { setAgentId(value); setCurrent(1) }}>
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
        <Select value={retrieval} onValueChange={(value) => { setRetrieval(value); setCurrent(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="检索命中" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">检索命中：全部</SelectItem>
            <SelectItem value="hit">有命中</SelectItem>
            <SelectItem value="miss">未命中</SelectItem>
          </SelectContent>
        </Select>
        <Select value={error} onValueChange={(value) => { setError(value); setCurrent(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="错误" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">错误：全部</SelectItem>
            <SelectItem value="yes">有错误</SelectItem>
            <SelectItem value="no">无错误</SelectItem>
          </SelectContent>
        </Select>
        <Input type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setCurrent(1) }} />
        <Input type="datetime-local" value={endAt} onChange={(e) => { setEndAt(e.target.value); setCurrent(1) }} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>耗时</TableHead>
            <TableHead>迭代</TableHead>
            <TableHead>检索</TableHead>
            <TableHead>工具</TableHead>
            <TableHead>错误</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <EmptyRow colSpan={8} />
          ) : (
            records.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{formatDate(item.created_at)}</TableCell>
                <TableCell>{item.agent_name || item.agent_code || '—'}</TableCell>
                <TableCell>{item.latency_ms != null ? `${Math.round(item.latency_ms)} ms` : '—'}</TableCell>
                <TableCell>
                  {item.iterations}
                  {item.hit_max_iterations ? (
                    <Badge className="ml-1" variant="secondary">打满</Badge>
                  ) : null}
                </TableCell>
                <TableCell>{item.used_search ? pct(item.retrieval_hit) : '未检索'}</TableCell>
                <TableCell>{pct(item.used_tools)}</TableCell>
                <TableCell>{item.error_code || '—'}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setDetailId(item.id)}>时间线</Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <PaginationBar
        current={query.data?.current || current}
        pages={query.data?.pages || 1}
        total={query.data?.total || 0}
        onChange={setCurrent}
      />

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>运行时间线</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <div className="text-muted-foreground">
                {detail.agent_name || detail.agent_code || '未绑定 Agent'} · {detail.model || '—'} · {detail.latency_ms != null ? `${Math.round(detail.latency_ms)} ms` : '—'}
              </div>
              <ol className="space-y-2">
                {(detail.timeline || []).map((event, index) => (
                  <li key={`${event.type}-${index}`} className="rounded-md border px-3 py-2">
                    {event.type === 'agent' ? (
                      <span>agent</span>
                    ) : (
                      <span>
                        tool({event.name || 'unknown'})
                        {event.empty_retrieval ? (
                          <Badge className="ml-2" variant="secondary">空检索</Badge>
                        ) : null}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">加载中…</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/agents/runs')({
  component: AgentRunsPage,
})
