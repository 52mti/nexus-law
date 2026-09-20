import request from '@/utils/request'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/'

export interface ApiEnvelope<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PageData<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

export interface PlanBenefits {
  code?: string | null
  hint?: string | null
  features?: string[]
  gift_points?: number
  points?: number
  discount_rate?: number | null
  exclusive_group?: string
}

export interface PlanItem {
  id: string
  name: string
  type: 'plan' | 'points' | 'membership' | string
  price: string
  period: string | null
  is_active: boolean
  benefits: PlanBenefits
}

export interface OrderItem {
  id: string
  product_type: 'plan' | 'points'
  product_id: string
  amount: string
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded' | string
  channel: string | null
  paid_at: string | null
  created_at: string | null
  plan?: PlanItem | null
}

export interface PayInfo {
  channel: string
  checkout_url: string
  amount: string
  sign?: string
}

export interface LedgerItem {
  id: string
  change: number
  balance: number
  type: string
  title: string
  biz_id: string | null
  remark: string | null
  created_at: string | null
}

export interface LedgerSummary {
  points: number
  recharge: number
  gift: number
  consume: number
}

export interface SubscriptionCurrent {
  id: string
  plan_id: string
  status: string
  start_at: string | null
  expire_at: string | null
  plan: PlanItem | null
}

function unwrap<T>(envelope: ApiEnvelope<T> | undefined): T {
  if (!envelope || typeof envelope.code !== 'number') {
    throw new Error('服务响应异常')
  }
  if (envelope.code !== 0) {
    throw new Error(envelope.message || '请求失败')
  }
  return envelope.data
}

function config() {
  return { baseURL: API_BASE }
}

export const listPlans = async (params?: { type?: string; current?: number; size?: number }) => {
  const res = await request.get<unknown, ApiEnvelope<PageData<PlanItem>>>('/api/v1/plan/list', {
    ...config(),
    params: { current: 1, size: 100, ...params },
  })
  return unwrap(res)
}

export const listPointLedgers = async (pagination: { current: number; size: number }) => {
  const res = await request.get<
    unknown,
    ApiEnvelope<PageData<LedgerItem> & { summary: LedgerSummary }>
  >('/api/v1/points/ledger', {
    ...config(),
    params: pagination,
  })
  return unwrap(res)
}

export const createOrder = async (data: {
  product_type: 'plan' | 'points'
  product_id: string
  channel?: string
}) => {
  const res = await request.post<
    unknown,
    ApiEnvelope<{ order: OrderItem; pay: PayInfo; plan: PlanItem }>
  >('/api/v1/order/create', data, config())
  return unwrap(res)
}

export const listOrders = async (pagination: { current: number; size: number; status?: string }) => {
  const res = await request.get<unknown, ApiEnvelope<PageData<OrderItem>>>('/api/v1/order/list', {
    ...config(),
    params: pagination,
  })
  return unwrap(res)
}

export const getOrderDetail = async (id: string) => {
  const res = await request.get<unknown, ApiEnvelope<OrderItem>>('/api/v1/order/detail', {
    ...config(),
    params: { id },
  })
  return unwrap(res)
}

export const confirmPayment = async (data: {
  order_id: string
  channel?: string
  amount?: string
  sign?: string
}) => {
  const res = await request.post<
    unknown,
    ApiEnvelope<{ order: OrderItem; idempotent: boolean }>
  >('/api/v1/payment/callback', data, config())
  return unwrap(res)
}

export const getCurrentSubscription = async () => {
  const res = await request.get<unknown, ApiEnvelope<SubscriptionCurrent | null>>(
    '/api/v1/subscription/current',
    config(),
  )
  return unwrap(res)
}
