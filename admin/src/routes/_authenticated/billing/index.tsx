import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { listConsume, listLedgers } from '@/api/commerce'
import { EmptyRow, PageHeader, PaginationBar } from '@/components/page'
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
import { compactParams, formatDate } from '@/lib/utils'

const TYPES = ['recharge', 'subscribe_gift', 'consume_chat', 'refund', 'admin_adjust']

function BillingPage() {
  const [tab, setTab] = useState('ledger')
  const [userId, setUserId] = useState('')
  const [type, setType] = useState('all')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [current, setCurrent] = useState(1)

  const ledgerQuery = useQuery({
    queryKey: ['admin-ledger', userId, type, startAt, endAt, current],
    queryFn: () =>
      listLedgers(
        compactParams({
          user_id: userId,
          type: type === 'all' ? undefined : type,
          start_at: startAt || undefined,
          end_at: endAt || undefined,
          current,
          size: 20,
        }),
      ),
    enabled: tab === 'ledger',
  })
  const consumeQuery = useQuery({
    queryKey: ['admin-consume', userId, startAt, endAt, current],
    queryFn: () =>
      listConsume(
        compactParams({
          user_id: userId,
          start_at: startAt || undefined,
          end_at: endAt || undefined,
          current,
          size: 20,
        }),
      ),
    enabled: tab === 'consume',
  })

  const active = tab === 'ledger' ? ledgerQuery.data : consumeQuery.data
  const records = active?.records || []

  return (
    <div>
      <PageHeader title="消费记录" description="全站积分流水与对话消耗" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="w-56" placeholder="用户 ID" value={userId} onChange={(e) => { setUserId(e.target.value); setCurrent(1) }} />
        {tab === 'ledger' ? (
          <Select value={type} onValueChange={(value) => { setType(value); setCurrent(1) }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {TYPES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Input type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setCurrent(1) }} />
        <Input type="datetime-local" value={endAt} onChange={(e) => { setEndAt(e.target.value); setCurrent(1) }} />
      </div>
      <Tabs value={tab} onValueChange={(value) => { setTab(value); setCurrent(1) }}>
        <TabsList>
          <TabsTrigger value="ledger">积分流水</TabsTrigger>
          <TabsTrigger value="consume">对话消耗</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger">
          <LedgerTable records={records} />
        </TabsContent>
        <TabsContent value="consume">
          <LedgerTable records={records} />
        </TabsContent>
      </Tabs>
      <PaginationBar
        current={active?.current || current}
        pages={active?.pages || 1}
        total={active?.total || 0}
        onChange={setCurrent}
      />
    </div>
  )
}

function LedgerTable({
  records,
}: {
  records: Awaited<ReturnType<typeof listLedgers>>['records']
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>时间</TableHead>
          <TableHead>用户</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>变动</TableHead>
          <TableHead>余额</TableHead>
          <TableHead>备注</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.length === 0 ? (
          <EmptyRow colSpan={6} />
        ) : (
          records.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{formatDate(item.created_at)}</TableCell>
              <TableCell>{item.user?.nickname || item.user?.phone || item.user_id}</TableCell>
              <TableCell>{item.title || item.type}</TableCell>
              <TableCell className={item.change < 0 ? 'text-destructive' : ''}>{item.change}</TableCell>
              <TableCell>{item.balance}</TableCell>
              <TableCell className="max-w-xs truncate">{item.remark || '—'}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export const Route = createFileRoute('/_authenticated/billing/')({
  component: BillingPage,
})
