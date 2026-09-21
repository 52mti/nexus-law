import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  bindRolePermissions,
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  updateRole,
} from '@/api/rbac'
import { EmptyRow, Field, PageHeader } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type { AdminRole } from '@/lib/types'

function RolesPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminRole | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permRole, setPermRole] = useState<AdminRole | null>(null)
  const [permCodes, setPermCodes] = useState<string[]>([])

  const rolesQuery = useQuery({ queryKey: ['admin-roles'], queryFn: listRoles })
  const permsQuery = useQuery({ queryKey: ['admin-permissions'], queryFn: listPermissions })
  const roles = rolesQuery.data?.records || []
  const permissions = permsQuery.data?.records || []

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updateRole({ id: editing.id, name, description })
        : createRole({ code, name, description }),
    onSuccess: () => {
      toast.success(editing ? '角色已更新' : '角色已创建')
      setFormOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      toast.success('角色已删除')
      void queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
    },
  })
  const bindMutation = useMutation({
    mutationFn: () => bindRolePermissions(permRole!.id, permCodes),
    onSuccess: () => {
      toast.success('权限已绑定')
      setPermRole(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
    },
  })

  function openCreate() {
    setEditing(null)
    setCode('')
    setName('')
    setDescription('')
    setFormOpen(true)
  }

  function openEdit(role: AdminRole) {
    setEditing(role)
    setCode(role.code)
    setName(role.name)
    setDescription(role.description || '')
    setFormOpen(true)
  }

  return (
    <div>
      <PageHeader title="角色权限" description="预置 super_admin 不可删除">
        <Button onClick={openCreate}>新建角色</Button>
      </PageHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>编码</TableHead>
            <TableHead>名称</TableHead>
            <TableHead>权限点</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.length === 0 ? (
            <EmptyRow colSpan={4} />
          ) : (
            roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  {role.code}
                  {role.code === 'super_admin' ? (
                    <Badge className="ml-2" variant="secondary">
                      保护
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>{role.name}</TableCell>
                <TableCell className="max-w-md text-xs">
                  {(role.permission_codes || []).join(', ') || '—'}
                </TableCell>
                <TableCell className="space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(role)}>
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPermRole(role)
                      setPermCodes(role.permission_codes || [])
                    }}
                  >
                    权限
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={role.code === 'super_admin'}
                    onClick={() => deleteMutation.mutate(role.id)}
                  >
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑角色' : '新建角色'}</DialogTitle>
          </DialogHeader>
          {!editing ? (
            <Field label="编码">
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
          ) : null}
          <Field label="名称">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="描述">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permRole} onOpenChange={(open) => !open && setPermRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>绑定权限点</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-auto">
            {permissions.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={permCodes.includes(item.code)}
                  onCheckedChange={(checked) => {
                    setPermCodes((prev) =>
                      checked ? [...prev, item.code] : prev.filter((code) => code !== item.code),
                    )
                  }}
                />
                {item.name} ({item.code})
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermRole(null)}>
              取消
            </Button>
            <Button disabled={bindMutation.isPending} onClick={() => bindMutation.mutate()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/roles/')({
  component: RolesPage,
})
