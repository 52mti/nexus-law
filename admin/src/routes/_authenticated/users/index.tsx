import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Checkbox, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { assignUserRoles, adjustUserPoints, listRoles, listUsers, updateUserStatus } from '@/api/rbac'
import { Field, PageHeader, tablePagination } from '@/components/page'
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
  const records = usersQuery.data?.records || []

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'active' | 'disabled' }) =>
      updateUserStatus(id, next),
    onSuccess: () => {
      message.success('状态已更新')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
  const rolesMutation = useMutation({
    mutationFn: () => assignUserRoles(roleUser!.id, selectedRoles),
    onSuccess: () => {
      message.success('角色已更新')
      setRoleUser(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
  const pointsMutation = useMutation({
    mutationFn: () =>
      adjustUserPoints(pointsUser!.id, Number(pointsChange), pointsRemark || undefined),
    onSuccess: () => {
      message.success('积分已调整')
      setPointsUser(null)
      setPointsChange('0')
      setPointsRemark('')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const columns: TableColumnsType<AdminUser> = [
    { title: '用户', dataIndex: 'nickname', render: (value) => value || '—' },
    {
      title: '联系方式',
      render: (_, user) => (
        <div>
          <div>{user.phone || '—'}</div>
          <div className="text-xs opacity-60">{user.email || '—'}</div>
        </div>
      ),
    },
    { title: '积分', dataIndex: 'points' },
    {
      title: '角色',
      dataIndex: 'role_codes',
      ellipsis: true,
      render: (codes: string[]) => (codes || []).join(', ') || '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value) => (
        <Tag color={value === 'active' ? 'success' : 'default'}>{value === 'active' ? '启用' : '禁用'}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'created_at', render: (value) => formatDate(value) },
    {
      title: '操作',
      width: 220,
      render: (_, user) => (
        <Space wrap>
          <Button
            size="small"
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
            size="small"
            onClick={() => {
              setRoleUser(user)
              setSelectedRoles(user.role_codes || [])
            }}
          >
            角色
          </Button>
          <Button
            size="small"
            onClick={() => {
              setPointsUser(user)
              setPointsChange('0')
              setPointsRemark('')
            }}
          >
            积分
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="用户" description="启用/禁用、分配角色、调整积分" />
      <Space wrap className="mb-4">
        <Input
          style={{ width: 224 }}
          placeholder="手机 / 邮箱 / 昵称"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value)
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
            { value: 'active', label: '启用' },
            { value: 'disabled', label: '禁用' },
          ]}
        />
        <Select
          style={{ width: 160 }}
          value={roleCode}
          onChange={(value) => {
            setRoleCode(value)
            setCurrent(1)
          }}
          options={[
            { value: 'all', label: '全部角色' },
            ...roles.map((role) => ({ value: role.code, label: role.name })),
          ]}
        />
      </Space>
      <Table
        rowKey="id"
        loading={usersQuery.isLoading}
        columns={columns}
        dataSource={records}
        pagination={tablePagination(usersQuery.data, current, setCurrent)}
      />

      <Modal
        title="分配角色"
        open={!!roleUser}
        onCancel={() => setRoleUser(null)}
        onOk={() => rolesMutation.mutate()}
        confirmLoading={rolesMutation.isPending}
        okButtonProps={{ disabled: !selectedRoles.length }}
      >
        <Checkbox.Group
          className="flex flex-col gap-2"
          value={selectedRoles}
          onChange={(values) => setSelectedRoles(values as string[])}
          options={roles.map((role) => ({
            value: role.code,
            label: `${role.name} (${role.code})`,
          }))}
        />
      </Modal>

      <Modal
        title="调整积分"
        open={!!pointsUser}
        onCancel={() => setPointsUser(null)}
        onOk={() => pointsMutation.mutate()}
        confirmLoading={pointsMutation.isPending}
      >
        <Field label="变动（正数增加，负数扣减）">
          <Input value={pointsChange} onChange={(e) => setPointsChange(e.target.value)} />
        </Field>
        <Field label="备注">
          <Input.TextArea value={pointsRemark} onChange={(e) => setPointsRemark(e.target.value)} />
        </Field>
      </Modal>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/users/')({
  component: UsersPage,
})
