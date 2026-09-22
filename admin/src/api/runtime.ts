import { apiGet, apiPost } from '@/lib/request'
import type {
  AgentItem,
  AgentRunItem,
  AgentRunStats,
  AgentTemplate,
  PageResult,
  PromptItem,
} from '@/lib/types

export function listPrompts(params: {
  agent_id?: string
  scene?: string
  is_active?: boolean
  current?: number
  size?: number
}) {
  return apiGet<PageResult<PromptItem>>('/admin/prompt/list', params)
}

export function getPromptDetail(id: string) {
  return apiGet<PromptItem>('/admin/prompt/detail', { id })
}

export function createPrompt(body: {
  agent_id: string
  scene: string
  content: string
  is_active?: boolean
}) {
  return apiPost<PromptItem>('/admin/prompt/create', body)
}

export function updatePrompt(id: string, content: string) {
  return apiPost<PromptItem>('/admin/prompt/update', { id, content })
}

export function activatePrompt(id: string) {
  return apiPost<PromptItem>('/admin/prompt/activate', { id })
}

export function deletePrompt(id: string) {
  return apiPost<{ id: string }>('/admin/prompt/delete', { id })
}

export function listAgents(params: {
  keyword?: string
  is_active?: boolean
  current?: number
  size?: number
}) {
  return apiGet<PageResult<AgentItem>>('/admin/agent/list', params)
}

export function getAgentDetail(id: string) {
  return apiGet<AgentItem>('/admin/agent/detail', { id })
}

export function createAgent(body: {
  name: string
  code: string
  description?: string
  tool_whitelist?: string[]
  dataset_ids?: string[]
  temperature?: number
  is_active?: boolean
  graph_code: string
}) {
  return apiPost<AgentItem>('/admin/agent/create', body)
}

export function updateAgent(body: {
  id: string
  name?: string
  description?: string
  tool_whitelist?: string[]
  dataset_ids?: string[]
  temperature?: number
  is_active?: boolean
}) {
  return apiPost<AgentItem>('/admin/agent/update', body)
}

export function deleteAgent(id: string) {
  return apiPost<{ id: string }>('/admin/agent/delete', { id })
}

export function bindAgentRoles(id: string, role_codes: string[]) {
  return apiPost<AgentItem>('/admin/agent/roles/bind', { id, role_codes })
}

export function listAgentTemplates() {
  return apiGet<AgentTemplate[]>('/admin/agent/templates')
}

export function listAgentRuns(params: {
  agent_id?: string
  user_id?: string
  retrieval_hit?: boolean
  error?: boolean
  start_at?: string
  end_at?: string
  current?: number
  size?: number
}) {
  return apiGet<PageResult<AgentRunItem>>('/admin/agent/run/list', params)
}

export function getAgentRunDetail(id: string) {
  return apiGet<AgentRunItem>('/admin/agent/run/detail', { id })
}

export function getAgentRunStats(params: {
  agent_id?: string
  start_at?: string
  end_at?: string
}) {
  return apiGet<AgentRunStats>('/admin/agent/run/stats', params)
}
