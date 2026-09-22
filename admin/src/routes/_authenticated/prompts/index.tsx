import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import {
  activatePrompt,
  createPrompt,
  deletePrompt,
  listAgents,
  listPrompts,
  updatePrompt,
} from '@/api/runtime'
import { Field, PageHeader, tablePagination } from '@/components/page'
import type { PromptItem } from '@/lib/types'
import { compactParams, formatDate } from '@/lib/utils'

function PromptsPage() {
  const queryClient = useQueryClient()
  const [agentId, setAgentId] = useState('all')
  const [scene, setScene] = useState('')
  const [active, setActive] = useState('all')
  const [current, setCurrent] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PromptItem | null>(null)
  const [formAgent, setFormAgent] = useState('')
  const [formScene, setFormScene] = useState('system')
  const [formContent, setFormContent] = useState('')

  const agentsQuery = useQuery({
    queryKey: ['admin-agents-all'],
    queryFn: () => listAgents({ current: 1, size: 100 }),
  })
  const promptsQuery = useQuery({
    queryKey: ['admin-prompts', agentId, scene, active, current],
    queryFn: () =>
      listPrompts(
        compactParams({
          agent_id: agentId === 'all' ? undefined : agentId,
          scene,
          is_active: active === 'all' ? undefined : active === 'true',
          current,
          size: 20,
        }),
      ),
  })
  const agents = agentsQuery.data?.records || []
  const records = promptsQuery.data?.records || []

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updatePrompt(editing.id, formContent)
        : createPrompt({ agent_id: formAgent, scene: formScene, content: formContent }),
    onSuccess: () => {
      message.success(editing ? '草稿已更新' : '版本已创建')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-prompts'] })
    },
  })
  const activateMutation = useMutation({
    mutationFn: activatePrompt,
    onSuccess: () => {
      message.success('已发布，对话将立即使用该版本')
      void queryClient.invalidateQueries({ queryKey: ['admin-prompts'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      message.success('已删除')
      void queryClient.invalidateQueries({ queryKey: ['admin-prompts'] })
    },
  })

  function openCreate() {
    setEditing(null)
    setFormAgent(agents[0]?.id || '')
    setFormScene('system')
    setFormContent('')
    setOpen(true)
  }

  function openEdit(item: PromptItem) {
    setEditing(item)
    setFormAgent(item.agent_id)
    setFormScene(item.scene)
    setFormContent(item.content)
    setOpen(true)
  }

  const columns: TableColumnsType<PromptItem> = [
    { title: 'Agent', render: (_, item) => item.agent_name || item.agent_code || item.agent_id },
    { title: '场景', dataIndex: 'scene' },
    { title: '版本', dataIndex: 'version', render: (value) => `v${value}` },
    {
      title: '状态',
      dataIndex: 'is_active',
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? '启用' : '草稿'}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updated_at', render: (value) => formatDate(value) },
    {
      title: '操作',
      width: 220,
      render: (_, item) => (
        <Space wrap>
          <Button size="small" onClick={() => openEdit(item)}>
            {item.is_active ? '查看' : '编辑'}
          </Button>
          {!item.is_active ? (
            <Button size="small" type="primary" onClick={() => activateMutation.mutate(item.id)}>
              发布
            </Button>
          ) : null}
          <Button size="small" danger onClick={() => deleteMutation.mutate(item.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="提示词" description="按 Agent / 场景维护版本，发布后立即生效">
        <Button type="primary" onClick={openCreate}>
          新建版本
        </Button>
      </PageHeader>
      <Space wrap className="mb-4">
        <Select
          style={{ width: 192 }}
          value={agentId}
          onChange={(value) => {
            setAgentId(value)
            setCurrent(1)
          }}
          options={[
            { value: 'all', label: '全部 Agent' },
            ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
          ]}
        />
        <Input
          style={{ width: 160 }}
          placeholder="场景，如 system"
          value={scene}
          onChange={(e) => {
            setScene(e.target.value)
            setCurrent(1)
          }}
        />
        <Select
          style={{ width: 144 }}
          value={active}
          onChange={(value) => {
            setActive(value)
            setCurrent(1)
          }}
          options={[
            { value: 'all', label: '全部' },
            { value: 'true', label: '已启用' },
            { value: 'false', label: '草稿' },
          ]}
        />
      </Space>
      <Table
        rowKey="id"
        loading={promptsQuery.isLoading}
        columns={columns}
        dataSource={records}
        pagination={tablePagination(promptsQuery.data, current, setCurrent)}
      />

      <Modal
        title={editing ? (editing.is_active ? '查看提示词' : '编辑草稿') : '新建版本'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => saveMutation.mutate()}
        okButtonProps={{ disabled: !!editing?.is_active }}
        confirmLoading={saveMutation.isPending}
        width={720}
        okText={editing?.is_active ? undefined : '保存'}
        footer={
          editing?.is_active
            ? [
                <Button key="close" onClick={() => setOpen(false)}>
                  关闭
                </Button>,
              ]
            : undefined
        }
      >
        {!editing ? (
          <>
            <Field label="Agent">
              <Select
                className="w-full"
                value={formAgent}
                onChange={setFormAgent}
                options={agents.map((agent) => ({ value: agent.id, label: agent.name }))}
              />
            </Field>
            <Field label="场景">
              <Input value={formScene} onChange={(e) => setFormScene(e.target.value)} />
            </Field>
          </>
        ) : null}
        <Field label="内容">
          <Input.TextArea
            rows={12}
            value={formContent}
            readOnly={!!editing?.is_active}
            onChange={(e) => setFormContent(e.target.value)}
          />
        </Field>
        {editing?.is_active ? (
          <Typography.Text type="secondary">已发布版本只读，修改请新建版本。</Typography.Text>
        ) : null}
      </Modal>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/prompts/')({
  component: PromptsPage,
})
