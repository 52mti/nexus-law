import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { createPlan, listPlans, updatePlan, updatePlanStatus } from '@/api/commerce'
import { EmptyRow, Field, PageHeader, PaginationBar } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
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
        features: features.split('\n').map((item) => item.trim()).filter(Boolean),
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
      toast.success(editing ? '套餐已更新' : '套餐已创建')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
    },
  })
  const statusMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updatePlanStatus(id, is_active),
    onSuccess: () => {
      toast.success('状态已更新')
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

  return (
    <div>
      <PageHeader title="套餐" description="会员套餐与积分充值档位">
        <Button onClick={openCreate}>新建套餐</Button>
      </PageHeader>
      <Select value={type} onValueChange={(value) => { setType(value); setCurrent(1) }}>
        <SelectTrigger className="mb-4 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部类型</SelectItem>
          <SelectItem value="plan">会员</SelectItem>
          <SelectItem value="points">积分</SelectItem>
        </SelectContent>
      </Select>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>价格</TableHead>
            <TableHead>周期</TableHead>
            <TableHead>权益</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <EmptyRow colSpan={7} />
          ) : (
            records.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.type === 'points' ? '积分' : '会员'}</TableCell>
                <TableCell>{item.price}</TableCell>
                <TableCell>{item.period || '—'}</TableCell>
                <TableCell className="text-xs">
                  积分 {item.benefits?.points ?? 0} / 赠送 {item.benefits?.gift_points ?? 0}
                </TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? 'success' : 'secondary'}>
                    {item.is_active ? '上架' : '下架'}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>编辑</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => statusMut.mutate({ id: item.id, is_active: !item.is_active })}
                  >
                    {item.is_active ? '下架' : '上架'}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑套餐' : '新建套餐'}</DialogTitle>
          </DialogHeader>
          <Field label="名称">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="类型">
            <Select value={planType} onValueChange={setPlanType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plan">会员</SelectItem>
                <SelectItem value="points">积分充值</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="价格">
            <Input value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          {planType === 'plan' ? (
            <Field label="周期">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">月</SelectItem>
                  <SelectItem value="quarter">季</SelectItem>
                  <SelectItem value="year">年</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field label={planType === 'points' ? '充值积分' : '赠送积分'}>
            <Input
              value={planType === 'points' ? points : giftPoints}
              onChange={(e) => (planType === 'points' ? setPoints(e.target.value) : setGiftPoints(e.target.value))}
            />
          </Field>
          <Field label="权益说明（每行一条）">
            <Textarea value={features} onChange={(e) => setFeatures(e.target.value)} />
          </Field>
          {!editing ? (
            <div className="flex items-center gap-2 text-sm">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              立即上架
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/plans/')({
  component: PlansPage,
})
