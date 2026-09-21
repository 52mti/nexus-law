import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { fulfillOrder, listOrders } from '@/api/commerce'
import { EmptyRow, PageHeader, PaginationBar } from '@/components/page'
import { Badge } from '@/components/ui/badge'
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
import { compactParams, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

const STATUSES = ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded']

function OrdersPage() {
  const queryClient = useQueryClient()
  const isSuper = useAuthStore((s) => s.isSuperAdmin())
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState('all')
  const [productType, setProductType] = useState('all')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [current, setCurrent] = useState(1)

  const query = useQuery({
    queryKey: ['admin-orders', userId, status, productType, startAt, endAt, current],
    queryFn: () =>
      listOrders(
        compactParams({
          user_id: userId,
          status: status === 'all' ? undefined : status,
          product_type: productType === 'all' ? undefined : productType,
          start_at: startAt || undefined,
          end_at: endAt || undefined,
          current,
          size: 20,
        }),
      ),
  })
  const records = query.data?.records || []

  const fulfillMut = useMutation({
    mutationFn: fulfillOrder,
    onSuccess: () => {
      toast.success('补单已处理')
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
  })

  return (
    <div>
      <PageHeader title="订单" description="全站订单查询；补单仅超级管理员" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="w-56" placeholder="用户 ID" value={userId} onChange={(e) => { setUserId(e.target.value); setCurrent(1) }} />
        <Select value={status} onValueChange={(value) => { setStatus(value); setCurrent(1) }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {STATUSES.map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={productType} onValueChange={(value) => { setProductType(value); setCurrent(1) }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部商品</SelectItem>
            <SelectItem value="plan">会员</SelectItem>
            <SelectItem value="points">积分</SelectItem>
          </SelectContent>
        </Select>
        <Input type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setCurrent(1) }} />
        <Input type="datetime-local" value={endAt} onChange={(e) => { setEndAt(e.target.value); setCurrent(1) }} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>订单号</TableHead>
            <TableHead>用户</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>金额</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>渠道</TableHead>
            <TableHead>时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <EmptyRow colSpan={8} />
          ) : (
            records.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">{item.id}</TableCell>
                <TableCell>
                  {item.user?.nickname || item.user?.phone || item.user_id}
                </TableCell>
                <TableCell>{item.product_type}</TableCell>
                <TableCell>{item.amount}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'fulfilled' || item.status === 'paid' ? 'success' : 'secondary'}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>{item.channel || '—'}</TableCell>
                <TableCell>{formatDate(item.created_at)}</TableCell>
                <TableCell>
                  {isSuper && item.status !== 'fulfilled' && item.status !== 'cancelled' && item.status !== 'refunded' ? (
                    <Button size="sm" onClick={() => fulfillMut.mutate(item.id)}>补单</Button>
                  ) : (
                    '—'
                  )}
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
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/orders/')({
  component: OrdersPage,
})
