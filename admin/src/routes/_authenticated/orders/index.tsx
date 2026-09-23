import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button, DatePicker, Input, Select, Space, Table, Tag, message } from 'antd'
import type { TableColumnsType } from 'antd'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { fulfillOrder, listOrders } from '@/api/commerce'
import { PageHeader, tablePagination } from '@/components/page'
import type { OrderItem } from '@/lib/types'
import { compactParams, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

const STATUSES = ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded']

function OrdersPage() {
  const queryClient = useQueryClient()
  const isSuper = useAuthStore((s) => s.isSuperAdmin())
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState('all')
  const [productType, setProductType] = useState('all')
  const [startAt, setStartAt] = useState<Dayjs | null>(null)
  const [endAt, setEndAt] = useState<Dayjs | null>(null)
  const [current, setCurrent] = useState(1)

  const query = useQuery({
    queryKey: ['admin-orders', userId, status, productType, startAt, endAt, current],
    queryFn: () =>
      listOrders(
        compactParams({
          user_id: userId,
          status: status === 'all' ? undefined : status,
          product_type: productType === 'all' ? undefined : productType,
          start_at: startAt?.startOf('day').toISOString(),
          end_at: endAt?.endOf('day').toISOString(),
          current,
          size: 20,
        }),
      ),
  })
  const records = query.data?.records || []

  const fulfillMut = useMutation({
    mutationFn: fulfillOrder,
    onSuccess: () => {
      message.success('补单已处理')
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
  })

  const columns: TableColumnsType<OrderItem> = [
    { title: '订单号', dataIndex: 'id', render: (value) => <span className="font-mono text-xs">{value}</span> },
    {
      title: '用户',
      render: (_, item) => item.user?.nickname || item.user?.phone || item.user_id,
    },
    { title: '类型', dataIndex: 'product_type' },
    { title: '金额', dataIndex: 'amount' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value) => (
        <Tag color={value === 'fulfilled' || value === 'paid' ? 'success' : 'default'}>{value}</Tag>
      ),
    },
    { title: '渠道', dataIndex: 'channel', render: (value) => value || '—' },
    { title: '时间', dataIndex: 'created_at', render: (value) => formatDate(value) },
    {
      title: '操作',
      render: (_, item) =>
        isSuper && item.status !== 'fulfilled' && item.status !== 'cancelled' && item.status !== 'refunded' ? (
          <Button size="small" type="primary" onClick={() => fulfillMut.mutate(item.id)}>
            补单
          </Button>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <div>
      <PageHeader title="订单" description="全站订单查询；补单仅超级管理员" />
      <Space wrap className="mb-4">
        <Input
          style={{ width: 224 }}
          placeholder="用户 ID"
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value)
            setCurrent(1)
          }}
        />
        <Select
          style={{ width: 144 }}
          value={status}
          onChange={(value) => {
            setStatus(value)
            setCurrent(1)
          }}
          options={[
            { value: 'all', label: '全部状态' },
            ...STATUSES.map((item) => ({ value: item, label: item })),
          ]}
        />
        <Select
          style={{ width: 144 }}
          value={productType}
          onChange={(value) => {
            setProductType(value)
            setCurrent(1)
          }}
          options={[
            { value: 'all', label: '全部商品' },
            { value: 'plan', label: '会员' },
            { value: 'points', label: '积分' },
          ]}
        />
        <DatePicker.RangePicker
          value={startAt && endAt ? [startAt, endAt] : null}
          placeholder={['开始时间', '结束时间']}
          onChange={(dates) => {
            setStartAt(dates?.[0] ?? null)
            setEndAt(dates?.[1] ?? null)
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
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/orders/')({
  component: OrdersPage,
})
