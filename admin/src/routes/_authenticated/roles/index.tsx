import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Checkbox, Input, Modal, Space, Table, Tag, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import {
  bindRolePermissions,
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  updateRole,
} from '@/api/rbac'
import { Field, PageHeader } from '@/components/page'
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
      message.success(editing ? '角色已更新' : '角色已创建')
      setFormOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      message.success('角色已删除')
      void queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
    },
  })
  const bindMutation = useMutation({
    mutationFn: () => bindRolePermissions(permRole!.id, permCodes),
    onSuccess: () => {
      message.success('权限已绑定')
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

  const columns: TableColumnsType<AdminRole> = [
    {
      title: '编码',
      dataIndex: 'code',
      render: (value) => (
        <span>
          {value}
          {value === 'super_admin' ? (
            <Tag className="ml-2">保护</Tag>
          ) : null}
        </span>
      ),
    },
    { title: '名称', dataIndex: 'name' },
    {
      title: '权限点',
      dataIndex: 'permission_codes',
      ellipsis: true,
      render: (codes: string[]) => (codes || []).join(', ') || '—',
    },
    {
      title: '操作',
      width: 220,
      render: (_, role) => (
        <Space wrap>
          <Button size="small" onClick={() => openEdit(role)}>
            编辑
          </Button>
          <Button
            size="small"
            onClick={() => {
              setPermRole(role)
              setPermCodes(role.permission_codes || [])
            }}
          >
            权限
          </Button>
          <Button
            size="small"
            danger
            disabled={role.code === 'super_admin'}
            onClick={() => deleteMutation.mutate(role.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="角色权限" description="预置 super_admin 不可删除">
        <Button type="primary" onClick={openCreate}>
          新建角色
        </Button>
      </PageHeader>
      <Table rowKey="id" loading={rolesQuery.isLoading} columns={columns} dataSource={roles} pagination={false} />

      <Modal
        title={editing ? '编辑角色' : '新建角色'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={() => saveMutation.mutate()}
        confirmLoading={saveMutation.isPending}
      >
        {!editing ? (
          <Field label="编码">
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
        ) : null}
        <Field label="名称">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="描述">
          <Input.TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </Modal>

      <Modal
        title="绑定权限点"
        open={!!permRole}
        onCancel={() => setPermRole(null)}
        onOk={() => bindMutation.mutate()}
        confirmLoading={bindMutation.isPending}
      >
        <div className="max-h-80 overflow-auto">
          <Checkbox.Group
            className="flex flex-col gap-2"
            value={permCodes}
            onChange={(values) => setPermCodes(values as string[])}
            options={permissions.map((item) => ({
              value: item.code,
              label: `${item.name} (${item.code})`,
            }))}
          />
        </div>
      </Modal>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/roles/')({
  component: RolesPage,
})
