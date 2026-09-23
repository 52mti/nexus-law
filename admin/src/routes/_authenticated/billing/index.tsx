import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { DatePicker, Input, Select, Space, Table, Tabs } from 'antd'
import type { TableColumnsType } from 'antd'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { listConsume, listLedgers } from '@/api/commerce'
import { PageHeader, tablePagination } from '@/components/page'
import type { LedgerItem } from '@/lib/types'
import { compactParams, formatDate } from '@/lib/utils'

const TYPES = ['recharge', 'subscribe_gift', 'consume_chat', 'refund', 'admin_adjust']

function BillingPage() {
  const [tab, setTab] = useState('ledger')
  const [userId, setUserId] = useState('')
  const [type, setType] = useState('all')
  const [startAt, setStartAt] = useState<Dayjs | null>(null)
  const [endAt, setEndAt] = useState<Dayjs | null>(null)
  const [current, setCurrent] = useState(1)

  const ledgerQuery = useQuery({
    queryKey: ['admin-ledger', userId, type, startAt, endAt, current],
    queryFn: () =>
      listLedgers(
        compactParams({
          user_id: userId,
          type: type === 'all' ? undefined : type,
          start_at: startAt?.toISOString(),
          end_at: endAt?.toISOString(),
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
          start_at: startAt?.toISOString(),
          end_at: endAt?.toISOString(),
          current,
          size: 20,
        }),
      ),
    enabled: tab === 'consume',
  })

  const active = tab === 'ledger' ? ledgerQuery.data : consumeQuery.data
  const records = active?.records || []

  const columns: TableColumnsType<LedgerItem> = [
    { title: '时间', dataIndex: 'created_at', render: (value) => formatDate(value) },
    { title: '用户', render: (_, item) => item.user?.nickname || item.user?.phone || item.user_id },
    { title: '类型', render: (_, item) => item.title || item.type },
    {
      title: '变动',
      dataIndex: 'change',
      render: (value) => <span className={value < 0 ? 'text-red-500' : ''}>{value}</span>,
    },
    { title: '余额', dataIndex: 'balance' },
    { title: '备注', dataIndex: 'remark', ellipsis: true, render: (value) => value || '—' },
  ]

  return (
    <div>
      <PageHeader title="消费记录" description="全站积分流水与对话消耗" />
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
        {tab === 'ledger' ? (
          <Select
            style={{ width: 176 }}
            value={type}
            onChange={(value) => {
              setType(value)
              setCurrent(1)
            }}
            options={[
              { value: 'all', label: '全部类型' },
              ...TYPES.map((item) => ({ value: item, label: item })),
            ]}
          />
        ) : null}
        <DatePicker.RangePicker
          showTime
          value={startAt && endAt ? [startAt, endAt] : null}
          placeholder={['开始时间', '结束时间']}
          onChange={(dates) => {
            setStartAt(dates?.[0] ?? null)
            setEndAt(dates?.[1] ?? null)
            setCurrent(1)
          }}
        />
      </Space>
      <Tabs
        activeKey={tab}
        onChange={(value) => {
          setTab(value)
          setCurrent(1)
        }}
        items={[
          {
            key: 'ledger',
            label: '积分流水',
            children: (
              <Table
                rowKey="id"
                loading={ledgerQuery.isLoading}
                columns={columns}
                dataSource={records}
                pagination={tablePagination(active, current, setCurrent)}
              />
            ),
          },
          {
            key: 'consume',
            label: '对话消耗',
            children: (
              <Table
                rowKey="id"
                loading={consumeQuery.isLoading}
                columns={columns}
                dataSource={records}
                pagination={tablePagination(active, current, setCurrent)}
              />
            ),
          },
        ]}
      />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/billing/')({
  component: BillingPage,
})
