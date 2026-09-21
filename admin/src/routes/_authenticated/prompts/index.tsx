import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  activatePrompt,
  createPrompt,
  deletePrompt,
  listAgents,
  listPrompts,
  updatePrompt,
} from '@/api/runtime'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
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
      toast.success(editing ? '草稿已更新' : '版本已创建')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-prompts'] })
    },
  })
  const activateMutation = useMutation({
    mutationFn: activatePrompt,
    onSuccess: () => {
      toast.success('已发布，对话将立即使用该版本')
      void queryClient.invalidateQueries({ queryKey: ['admin-prompts'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      toast.success('已删除')
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

  return (
    <div>
      <PageHeader title="提示词" description="按 Agent / 场景维护版本，发布后立即生效">
        <Button onClick={openCreate}>新建版本</Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={agentId} onValueChange={(value) => { setAgentId(value); setCurrent(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部 Agent</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="w-40"
          placeholder="场景，如 system"
          value={scene}
          onChange={(e) => { setScene(e.target.value); setCurrent(1) }}
        />
        <Select value={active} onValueChange={(value) => { setActive(value); setCurrent(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="true">已启用</SelectItem>
            <SelectItem value="false">草稿</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>场景</TableHead>
            <TableHead>版本</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>更新时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <EmptyRow colSpan={6} />
          ) : (
            records.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.agent_name || item.agent_code || item.agent_id}</TableCell>
                <TableCell>{item.scene}</TableCell>
                <TableCell>v{item.version}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? 'success' : 'secondary'}>
                    {item.is_active ? '启用' : '草稿'}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(item.updated_at)}</TableCell>
                <TableCell className="space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                    {item.is_active ? '查看' : '编辑'}
                  </Button>
                  {!item.is_active ? (
                    <Button size="sm" onClick={() => activateMutation.mutate(item.id)}>
                      发布
                    </Button>
                  ) : null}
                  <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(item.id)}>
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <PaginationBar
        current={promptsQuery.data?.current || current}
        pages={promptsQuery.data?.pages || 1}
        total={promptsQuery.data?.total || 0}
        onChange={setCurrent}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? (editing.is_active ? '查看提示词' : '编辑草稿') : '新建版本'}</DialogTitle>
          </DialogHeader>
          {!editing ? (
            <>
              <Field label="Agent">
                <Select value={formAgent} onValueChange={setFormAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择 Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="场景">
                <Input value={formScene} onChange={(e) => setFormScene(e.target.value)} />
              </Field>
            </>
          ) : null}
          <Field label="内容">
            <Textarea
              className="min-h-64"
              value={formContent}
              readOnly={!!editing?.is_active}
              onChange={(e) => setFormContent(e.target.value)}
            />
          </Field>
          {editing?.is_active ? (
            <p className="text-xs text-muted-foreground">已发布版本只读，修改请新建版本。</p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              关闭
            </Button>
            {!editing?.is_active ? (
              <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                保存
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/prompts/')({
  component: PromptsPage,
})
