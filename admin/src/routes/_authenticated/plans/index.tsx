import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Input, Modal, Select, Space, Switch, Table, Tag, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { createPlan, listPlans, updatePlan, updatePlanStatus } from '@/api/commerce'
import { Field, PageHeader, tablePagination } from '@/components/page'
import type { PlanItem } from '@/lib/types'
import { compactParams } from '@/lib/utils'

function PlansPage() {
  const queryClient = useQueryClient()
  const [type, setType] = useState('all')
  const [current, setCurrent] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PlanItem | null>(null)
  const [name, setName] = useState('')
  const [planType, setPlanType] = useState('plan')
  const [price, setPrice] = useState('0')
  const [period, setPeriod] = useState('month')
  const [points, setPoints] = useState('0')
  const [giftPoints, setGiftPoints] = useState('0')
  const [features, setFeatures] = useState('')
  const [isActive, setIsActive] = useState(true)

  const query = useQuery({
    queryKey: ['admin-plans', type, current],
    queryFn: () =>
      listPlans(compactParams({ type: type === 'all' ? undefined : type, current, size: 20 })),
  })
  const records = query.data?.records || []

  const saveMut = useMutation({
    mutationFn: () => {
      const benefits = {
        points: Number(points) || 0,
        gift_points: Number(giftPoints) || 0,
        features: features
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      }
      return editing
        ? updatePlan({
            id: editing.id,
            name,
            type: planType,
            price,
            period: planType === 'plan' ? period : undefined,
            benefits,
          })
        : createPlan({
            name,
            type: planType,
            price,
            period: planType === 'plan' ? period : undefined,
            benefits,
            is_active: isActive,
          })
    },
    onSuccess: () => {
      message.success(editing ? '套餐已更新' : '套餐已创建')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
    },
  })
  const statusMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updatePlanStatus(id, is_active),
    onSuccess: () => {
      message.success('状态已更新')
      void queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
    },
  })

  function openCreate() {
    setEditing(null)
    setName('')
    setPlanType('plan')
    setPrice('0')
    setPeriod('month')
    setPoints('0')
    setGiftPoints('0')
    setFeatures('')
    setIsActive(true)
    setOpen(true)
  }

  function openEdit(item: PlanItem) {
    setEditing(item)
    setName(item.name)
    setPlanType(item.type)
    setPrice(item.price)
    setPeriod(item.period || 'month')
    setPoints(String(item.benefits?.points ?? 0))
    setGiftPoints(String(item.benefits?.gift_points ?? 0))
    setFeatures((item.benefits?.features || []).join('\n'))
    setIsActive(item.is_active)
    setOpen(true)
  }

  const columns: TableColumnsType<PlanItem> = [
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (value) => (value === 'points' ? '积分' : '会员') },
    { title: '价格', dataIndex: 'price' },
    { title: '周期', dataIndex: 'period', render: (value) => value || '—' },
    {
      title: '权益',
      render: (_, item) => `积分 ${item.benefits?.points ?? 0} / 赠送 ${item.benefits?.gift_points ?? 0}`,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? '上架' : '下架'}</Tag>,
    },
    {
      title: '操作',
      render: (_, item) => (
        <Space>
          <Button size="small" onClick={() => openEdit(item)}>
            编辑
          </Button>
          <Button size="small" onClick={() => statusMut.mutate({ id: item.id, is_active: !item.is_active })}>
            {item.is_active ? '下架' : '上架'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="套餐" description="会员套餐与积分充值档位">
        <Button type="primary" onClick={openCreate}>
          新建套餐
        </Button>
      </PageHeader>
      <Select
        className="mb-4"
        style={{ width: 160 }}
        value={type}
        onChange={(value) => {
          setType(value)
          setCurrent(1)
        }}
        options={[
          { value: 'all', label: '全部类型' },
          { value: 'plan', label: '会员' },
          { value: 'points', label: '积分' },
        ]}
      />
      <Table
        rowKey="id"
        loading={query.isLoading}
        columns={columns}
        dataSource={records}
        pagination={tablePagination(query.data, current, setCurrent)}
      />

      <Modal
        title={editing ? '编辑套餐' : '新建套餐'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => saveMut.mutate()}
        confirmLoading={saveMut.isPending}
      >
        <Field label="名称">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="类型">
          <Select
            className="w-full"
            value={planType}
            onChange={setPlanType}
            options={[
              { value: 'plan', label: '会员' },
              { value: 'points', label: '积分充值' },
            ]}
          />
        </Field>
        <Field label="价格">
          <Input value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        {planType === 'plan' ? (
          <Field label="周期">
            <Select
              className="w-full"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'month', label: '月' },
                { value: 'quarter', label: '季' },
                { value: 'year', label: '年' },
              ]}
            />
          </Field>
        ) : null}
        <Field label={planType === 'points' ? '充值积分' : '赠送积分'}>
          <Input
            value={planType === 'points' ? points : giftPoints}
            onChange={(e) => (planType === 'points' ? setPoints(e.target.value) : setGiftPoints(e.target.value))}
          />
        </Field>
        <Field label="权益说明（每行一条）">
          <Input.TextArea value={features} onChange={(e) => setFeatures(e.target.value)} />
        </Field>
        {!editing ? (
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onChange={setIsActive} />
            立即上架
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/plans/')({
  component: PlansPage,
})
