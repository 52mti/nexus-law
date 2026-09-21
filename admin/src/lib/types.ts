export interface ApiEnvelope<T> {
  code: number
  data: T
  message: string
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

export interface AdminProfile {
  id: string
  email: string | null
  phone: string | null
  nickname: string | null
  avatar_url: string | null
  points: number
  status: string
  role_codes: string[]
  permission_codes: string[]
}

export interface LoginResult {
  access_token: string
  token_type: string
  expires_in_hours: number
  user: AdminProfile
  permission_codes: string[]
}

export interface AdminUser {
  id: string
  email: string | null
  phone: string | null
  nickname: string | null
  avatar_url: string | null
  points: number
  status: string
  role_codes: string[]
  created_at?: string | null
  updated_at?: string | null
}

export interface AdminRole {
  id: string
  code: string
  name: string
  description: string | null
  permission_codes: string[]
  created_at?: string | null
  updated_at?: string | null
}

export interface AdminPermission {
  id: string
  code: string
  name: string
  type: string
  created_at?: string | null
}

export interface PromptItem {
  id: string
  agent_id: string
  agent_code: string | null
  agent_name: string | null
  scene: string
  content: string
  version: number
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface AgentItem {
  id: string
  name: string
  code: string
  description: string | null
  tool_whitelist: string[]
  dataset_ids: string[]
  temperature: number
  is_active: boolean
  role_codes: string[]
  created_at?: string | null
  updated_at?: string | null
}

export interface DatasetItem {
  id: string
  name: string
  title: string | null
  description: string | null
  region: string | null
  visibility: string | null
  weaviate_collection?: string | null
  document_count?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface DocumentItem {
  id: string
  dataset_id: string | null
  collection: string | null
  source: string | null
  title: string | null
  law_level: string | null
  region: string | null
  status: string
  chunk_count: number | null
  effective_at?: string | null
  expired_at?: string | null
  error_message?: string | null
  storage_status?: string | null
  oss_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ChunkItem {
  id: string
  chunk_index: number
  content: string
  char_count?: number
}

export interface PlanItem {
  id: string
  name: string
  type: string
  price: string
  period: string | null
  is_active: boolean
  benefits: {
    code?: string | null
    hint?: string | null
    features?: string[]
    gift_points?: number
    points?: number
    discount_rate?: number | null
    exclusive_group?: string | null
  }
  created_at?: string | null
  updated_at?: string | null
}

export interface OrderUser {
  id: string
  nickname: string | null
  phone: string | null
  email: string | null
}

export interface OrderItem {
  id: string
  user_id: string
  product_type: string
  product_id: string | null
  amount: string
  status: string
  channel: string | null
  paid_at?: string | null
  created_at?: string | null
  user?: OrderUser
  plan?: PlanItem
}

export interface LedgerItem {
  id: string
  user_id: string
  change: number
  balance: number
  type: string
  title: string
  biz_id: string | null
  remark: string | null
  created_at?: string | null
  user?: OrderUser
}

export interface AuditItem {
  id: string
  admin_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  detail: unknown
  created_at?: string | null
  admin?: OrderUser
}
