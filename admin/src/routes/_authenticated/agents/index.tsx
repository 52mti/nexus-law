import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Button, Checkbox, Input, Modal, Select, Space, Switch, Table, Tag, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { useState } from 'react'
import { listDatasets } from '@/api/knowledge'
import { listRoles } from '@/api/rbac'
import {
  bindAgentRoles,
  createAgent,
  deleteAgent,
  listAgentTemplates,
  listAgents,
  updateAgent,
} from '@/api/runtime'
import { Field, PageHeader, tablePagination } from '@/components/page'
import type { AgentItem } from '@/lib/types'
import { compactParams } from '@/lib/utils'

const TOOLS = ['get_current_time', 'calculator', 'search_documents']

function AgentsPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [current, setCurrent] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AgentItem | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [graphCode, setGraphCode] = useState('legal_qa_react')
  const [description, setDescription] = useState('')
  const [temperature, setTemperature] = useState('0.2')
  const [isActive, setIsActive] = useState(true)
  const [tools, setTools] = useState<string[]>(TOOLS)
  const [datasetIds, setDatasetIds] = useState<string[]>([])
  const [roleAgent, setRoleAgent] = useState<AgentItem | null>(null)
  const [roleCodes, setRoleCodes] = useState<string[]>([])

  const agentsQuery = useQuery({
    queryKey: ['admin-agents', keyword, current],
    queryFn: () => listAgents(compactParams({ keyword, current, size: 20 })),
  })
  const datasetsQuery = useQuery({
    queryKey: ['admin-datasets-all'],
    queryFn: () => listDatasets({ current: 1, size: 100 }),
  })
  const rolesQuery = useQuery({ queryKey: ['admin-roles'], queryFn: listRoles })
  const templatesQuery = useQuery({
    queryKey: ['admin-agent-templates'],
    queryFn: listAgentTemplates,
  })
  const records = agentsQuery.data?.records || []
  const datasets = datasetsQuery.data?.records || []
  const roles = rolesQuery.data?.records || []
  const templates = templatesQuery.data || []

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description,
        tool_whitelist: tools,
        dataset_ids: datasetIds,
        temperature: Number(temperature),
        is_active: isActive,
      }
      return editing
        ? updateAgent({ id: editing.id, ...payload })
        : createAgent({ code, graph_code: graphCode, ...payload })
    },
    onSuccess: () => {
      message.success(editing ? 'Agent 实例已更新' : '已从模板创建实例')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-agents'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      message.success('已删除')
      void queryClient.invalidateQueries({ queryKey: ['admin-agents'] })
    },
  })
  const bindMutation = useMutation({
    mutationFn: () => bindAgentRoles(roleAgent!.id, roleCodes),
    onSuccess: () => {
      message.success('角色已绑定')
      setRoleAgent(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-agents'] })
    },
  })

  function openCreate() {
    setEditing(null)
    setName('')
    setCode('')
    setGraphCode(templates[0]?.code || 'legal_qa_react')
    setDescription('')
    setTemperature('0.2')
    setIsActive(true)
    setTools(TOOLS)
    setDatasetIds([])
    setOpen(true)
  }

  function openEdit(item: AgentItem) {
    setEditing(item)
    setName(item.name)
    setCode(item.code)
    setGraphCode(item.graph_code || 'legal_qa_react')
    setDescription(item.description || '')
    setTemperature(String(item.temperature ?? 0.2))
    setIsActive(item.is_active)
    setTools(item.tool_whitelist?.length ? item.tool_whitelist : [])
    setDatasetIds(item.dataset_ids || [])
    setOpen(true)
  }

  const columns: TableColumnsType<AgentItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (value, item) => (
        <span>
          {value}
          {item.is_system ? <Tag className="ml-2">系统</Tag> : null}
        </span>
      ),
    },
    { title: '编码', dataIndex: 'code' },
    { title: '模板', dataIndex: 'graph_code', render: (value) => value || 'legal_qa_react' },
    { title: '温度', dataIndex: 'temperature' },
    {
      title: '工具',
      dataIndex: 'tool_whitelist',
      ellipsis: true,
      render: (value: string[]) => (value || []).join(', ') || '—',
    },
    {
      title: '角色',
      dataIndex: 'role_codes',
      ellipsis: true,
      render: (value: string[]) => (value || []).join(', ') || '—',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      width: 220,
      render: (_, item) => (
        <Space wrap>
          <Button size="small" onClick={() => openEdit(item)}>
            编辑
          </Button>
          <Button
            size="small"
            onClick={() => {
              setRoleAgent(item)
              setRoleCodes(item.role_codes || [])
            }}
          >
            角色
          </Button>
          <Button size="small" danger disabled={item.is_system} onClick={() => deleteMutation.mutate(item.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Agent" description="从代码模板创建实例，配置白名单、知识库与角色">
        <Link to="/agents/runs">
          <Button>运行记录</Button>
        </Link>
        <Link to="/agents/stats">
          <Button>统计</Button>
        </Link>
        <Button type="primary" onClick={openCreate}>
          从模板新建
        </Button>
      </PageHeader>
      <div className="mb-4">
        <Input
          className="mb-4"
          style={{ width: 224 }}
          placeholder="搜索名称/编码"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value)
            setCurrent(1)
          }}
        />
      </div>
      <Table
        rowKey="id"
        loading={agentsQuery.isLoading}
        columns={columns}
        dataSource={records}
        pagination={tablePagination(agentsQuery.data, current, setCurrent)}
      />

      <Modal
        title={editing ? '编辑 Agent 实例' : '从模板新建实例'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => saveMutation.mutate()}
        confirmLoading={saveMutation.isPending}
        width={640}
      >
        {editing ? (
          <Field label="图模板（只读）">
            <Input value={editing.graph_code || 'legal_qa_react'} disabled />
          </Field>
        ) : (
          <Field label="图模板">
            <Select
              className="w-full"
              value={graphCode}
              onChange={setGraphCode}
              options={templates.map((item) => ({
                value: item.code,
                label: `${item.name} (${item.code})`,
              }))}
            />
          </Field>
        )}
        <Field label="名称">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={editing ? '实例编码（只读）' : '实例编码'}>
          <Input value={code} disabled={!!editing} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label="描述">
          <Input.TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="温度 (0-2)">
          <Input value={temperature} onChange={(e) => setTemperature(e.target.value)} />
        </Field>
        <div className="mb-3 flex items-center gap-2 text-sm">
          <Switch checked={isActive} onChange={setIsActive} />
          启用
        </div>
        <Field label="工具白名单">
          <Checkbox.Group
            className="flex flex-col gap-2"
            value={tools}
            onChange={(values) => setTools(values as string[])}
            options={TOOLS.map((tool) => ({ value: tool, label: tool }))}
          />
        </Field>
        <Field label="关联知识库">
          <div className="max-h-40 overflow-auto">
            <Checkbox.Group
              className="flex flex-col gap-2"
              value={datasetIds}
              onChange={(values) => setDatasetIds(values as string[])}
              options={datasets.map((dataset) => ({
                value: dataset.id,
                label: dataset.title || dataset.name,
              }))}
            />
          </div>
        </Field>
      </Modal>

      <Modal
        title="绑定可用角色"
        open={!!roleAgent}
        onCancel={() => setRoleAgent(null)}
        onOk={() => bindMutation.mutate()}
        confirmLoading={bindMutation.isPending}
      >
        <Checkbox.Group
          className="flex flex-col gap-2"
          value={roleCodes}
          onChange={(values) => setRoleCodes(values as string[])}
          options={roles.map((role) => ({
            value: role.code,
            label: `${role.name} (${role.code})`,
          }))}
        />
      </Modal>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/agents/')({
  component: AgentsPage,
})
