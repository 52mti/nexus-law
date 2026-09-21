import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getAuditDetail, listAudits } from '@/api/audit'
import { EmptyRow, PageHeader, PaginationBar } from '@/components/page'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

  return (
    <div>
      <PageHeader title="操作日志" description="管理员关键操作留痕" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="w-44" placeholder="操作人 ID" value={adminId} onChange={(e) => { setAdminId(e.target.value); setCurrent(1) }} />
        <Input className="w-40" placeholder="action" value={action} onChange={(e) => { setAction(e.target.value); setCurrent(1) }} />
        <Input className="w-36" placeholder="target_type" value={targetType} onChange={(e) => { setTargetType(e.target.value); setCurrent(1) }} />
        <Input className="w-44" placeholder="target_id" value={targetId} onChange={(e) => { setTargetId(e.target.value); setCurrent(1) }} />
        <Input type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setCurrent(1) }} />
        <Input type="datetime-local" value={endAt} onChange={(e) => { setEndAt(e.target.value); setCurrent(1) }} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间</TableHead>
            <TableHead>操作人</TableHead>
            <TableHead>动作</TableHead>
            <TableHead>对象</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <EmptyRow colSpan={5} />
          ) : (
            records.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{formatDate(item.created_at)}</TableCell>
                <TableCell>{item.admin?.nickname || item.admin?.phone || item.admin_id || '—'}</TableCell>
                <TableCell>{item.action}</TableCell>
                <TableCell>
                  {item.target_type || '—'} {item.target_id || ''}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setDetailId(item.id)}>
                    详情
                  </Button>
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
            <DialogTitle>日志详情</DialogTitle>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(detailQuery.data ?? {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/audit/')({
  component: AuditPage,
})
