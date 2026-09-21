import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { assignUserRoles, adjustUserPoints, listRoles, listUsers, updateUserStatus } from '@/api/rbac'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type { AdminUser } from '@/lib/types'
import { compactParams, formatDate } from '@/lib/utils'

function UsersPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
  const [roleCode, setRoleCode] = useState('all')
  const [current, setCurrent] = useState(1)
  const [roleUser, setRoleUser] = useState<AdminUser | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [pointsUser, setPointsUser] = useState<AdminUser | null>(null)
  const [pointsChange, setPointsChange] = useState('0')
  const [pointsRemark, setPointsRemark] = useState('')

  const usersQuery = useQuery({
    queryKey: ['admin-users', keyword, status, roleCode, current],
    queryFn: () =>
      listUsers(
        compactParams({
          keyword,
          status: status === 'all' ? undefined : status,
          role_code: roleCode === 'all' ? undefined : roleCode,
          current,
          size: 20,
        }),
      ),
  })
  const rolesQuery = useQuery({ queryKey: ['admin-roles'], queryFn: listRoles })
  const roles = rolesQuery.data?.records || []

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'active' | 'disabled' }) =>
      updateUserStatus(id, next),
    onSuccess: () => {
      toast.success('状态已更新')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
  const rolesMutation = useMutation({
    mutationFn: () => assignUserRoles(roleUser!.id, selectedRoles),
    onSuccess: () => {
      toast.success('角色已更新')
      setRoleUser(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
  const pointsMutation = useMutation({
    mutationFn: () =>
      adjustUserPoints(pointsUser!.id, Number(pointsChange), pointsRemark || undefined),
    onSuccess: () => {
      toast.success('积分已调整')
      setPointsUser(null)
      setPointsChange('0')
      setPointsRemark('')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const records = usersQuery.data?.records || []

  return (
    <div>
      <PageHeader title="用户" description="启用/禁用、分配角色、调整积分" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="w-56"
          placeholder="手机 / 邮箱 / 昵称"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value)
            setCurrent(1)
          }}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setCurrent(1)
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">启用</SelectItem>
            <SelectItem value="disabled">禁用</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={roleCode}
          onValueChange={(value) => {
            setRoleCode(value)
            setCurrent(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.code}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>用户</TableHead>
            <TableHead>联系方式</TableHead>
            <TableHead>积分</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <EmptyRow colSpan={7} />
          ) : (
            records.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.nickname || '—'}</TableCell>
                <TableCell>
                  <div>{user.phone || '—'}</div>
                  <div className="text-xs text-muted-foreground">{user.email || '—'}</div>
                </TableCell>
                <TableCell>{user.points}</TableCell>
                <TableCell className="max-w-48">
                  {(user.role_codes || []).join(', ') || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                    {user.status === 'active' ? '启用' : '禁用'}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(user.created_at)}</TableCell>
                <TableCell className="space-x-2 whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      statusMutation.mutate({
                        id: user.id,
                        next: user.status === 'active' ? 'disabled' : 'active',
                      })
                    }
                  >
                    {user.status === 'active' ? '禁用' : '启用'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRoleUser(user)
                      setSelectedRoles(user.role_codes || [])
                    }}
                  >
                    角色
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPointsUser(user)
                      setPointsChange('0')
                      setPointsRemark('')
                    }}
                  >
                    积分
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <PaginationBar
        current={usersQuery.data?.current || current}
        pages={usersQuery.data?.pages || 1}
        total={usersQuery.data?.total || 0}
        onChange={setCurrent}
      />

      <Dialog open={!!roleUser} onOpenChange={(open) => !open && setRoleUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分配角色</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedRoles.includes(role.code)}
                  onCheckedChange={(checked) => {
                    setSelectedRoles((prev) =>
                      checked ? [...prev, role.code] : prev.filter((code) => code !== role.code),
                    )
                  }}
                />
                {role.name} ({role.code})
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleUser(null)}>
              取消
            </Button>
            <Button disabled={!selectedRoles.length || rolesMutation.isPending} onClick={() => rolesMutation.mutate()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pointsUser} onOpenChange={(open) => !open && setPointsUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调整积分</DialogTitle>
          </DialogHeader>
          <Field label="变动（正数增加，负数扣减）">
            <Input value={pointsChange} onChange={(e) => setPointsChange(e.target.value)} />
          </Field>
          <Field label="备注">
            <Textarea value={pointsRemark} onChange={(e) => setPointsRemark(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsUser(null)}>
              取消
            </Button>
            <Button disabled={pointsMutation.isPending} onClick={() => pointsMutation.mutate()}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/users/')({
  component: UsersPage,
})
