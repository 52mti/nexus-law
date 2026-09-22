import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
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
import { EmptyRow, Field, PageHeader, PaginationBar } from '@/components/page'
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
      toast.success(editing ? 'Agent 实例已更新' : '已从模板创建实例')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-agents'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      toast.success('已删除')
      void queryClient.invalidateQueries({ queryKey: ['admin-agents'] })
    },
  })
  const bindMutation = useMutation({
    mutationFn: () => bindAgentRoles(roleAgent!.id, roleCodes),
    onSuccess: () => {
      toast.success('角色已绑定')
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

  function toggle(list: string[], value: string, checked: boolean) {
    return checked ? [...list, value] : list.filter((item) => item !== value)
  }

  return (
    <div>
      <PageHeader title="Agent" description="从代码模板创建实例，配置白名单、知识库与角色">
        <Button variant="outline" asChild>
          <Link to="/agents/runs">运行记录</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/agents/stats">统计</Link>
        </Button>
        <Button onClick={openCreate}>从模板新建</Button>
      </PageHeader>
      <Input
        className="mb-4 w-56"
        placeholder="搜索名称/编码"
        value={keyword}
        onChange={(e) => { setKeyword(e.target.value); setCurrent(1) }}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>编码</TableHead>
            <TableHead>模板</TableHead>
            <TableHead>温度</TableHead>
            <TableHead>工具</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <EmptyRow colSpan={8} />
          ) : (
            records.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.name}
                  {item.is_system ? (
                    <Badge className="ml-2" variant="secondary">系统</Badge>
                  ) : null}
                </TableCell>
                <TableCell>{item.code}</TableCell>
                <TableCell className="text-xs">{item.graph_code || 'legal_qa_react'}</TableCell>
                <TableCell>{item.temperature}</TableCell>
                <TableCell className="max-w-48 text-xs">{(item.tool_whitelist || []).join(', ') || '—'}</TableCell>
                <TableCell className="max-w-40 text-xs">{(item.role_codes || []).join(', ') || '—'}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? 'success' : 'secondary'}>
                    {item.is_active ? '启用' : '停用'}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>编辑</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRoleAgent(item)
                      setRoleCodes(item.role_codes || [])
                    }}
                  >
                    角色
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={item.is_system}
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <PaginationBar
        current={agentsQuery.data?.current || current}
        pages={agentsQuery.data?.pages || 1}
        total={agentsQuery.data?.total || 0}
        onChange={setCurrent}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑 Agent 实例' : '从模板新建实例'}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <Field label="图模板（只读）">
              <Input value={editing.graph_code || 'legal_qa_react'} disabled />
            </Field>
          ) : (
            <Field label="图模板">
              <Select value={graphCode} onValueChange={setGraphCode}>
                <SelectTrigger>
                  <SelectValue placeholder="选择代码模板" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.name} ({item.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="名称">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {!editing ? (
            <Field label="实例编码">
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
          ) : (
            <Field label="实例编码（只读）">
              <Input value={code} disabled />
            </Field>
          )}
          <Field label="描述">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="温度 (0-2)">
            <Input value={temperature} onChange={(e) => setTemperature(e.target.value)} />
          </Field>
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            启用
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">工具白名单</div>
            <div className="space-y-2">
              {TOOLS.map((tool) => (
                <label key={tool} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={tools.includes(tool)}
                    onCheckedChange={(checked) => setTools((prev) => toggle(prev, tool, !!checked))}
                  />
                  {tool}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">关联知识库</div>
            <div className="max-h-40 space-y-2 overflow-auto">
              {datasets.map((dataset) => (
                <label key={dataset.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={datasetIds.includes(dataset.id)}
                    onCheckedChange={(checked) =>
                      setDatasetIds((prev) => toggle(prev, dataset.id, !!checked))
                    }
                  />
                  {dataset.title || dataset.name}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleAgent} onOpenChange={(open) => !open && setRoleAgent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>绑定可用角色</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={roleCodes.includes(role.code)}
                  onCheckedChange={(checked) =>
                    setRoleCodes((prev) => toggle(prev, role.code, !!checked))
                  }
                />
                {role.name} ({role.code})
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleAgent(null)}>取消</Button>
            <Button disabled={bindMutation.isPending} onClick={() => bindMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/agents/')({
  component: AgentsPage,
})
