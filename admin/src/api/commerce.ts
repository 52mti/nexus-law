import { apiGet, apiPost } from '@/lib/request'
import type { LedgerItem, OrderItem, PageResult, PlanItem } from '@/lib/types'

export function listPlans(params: {
  type?: string
  is_active?: boolean
  current?: number
  size?: number
}) {
  return apiGet<PageResult<PlanItem>>('/admin/plan/list', params)
}

export function getPlanDetail(id: string) {
  return apiGet<PlanItem>('/admin/plan/detail', { id })
}

export function createPlan(body: {
  name: string
  type: string
  price: string
  period?: string
  benefits?: Record<string, unknown>
  is_active?: boolean
}) {
  return apiPost<PlanItem>('/admin/plan/create', body)
}

export function updatePlan(body: {
  id: string
  name?: string
  type?: string
  price?: string
  period?: string
  benefits?: Record<string, unknown>
}) {
  return apiPost<PlanItem>('/admin/plan/update', body)
}

export function updatePlanStatus(id: string, is_active: boolean) {
  return apiPost<PlanItem>('/admin/plan/status/update', { id, is_active })
}

export function listOrders(params: {
  user_id?: string
  status?: string
  product_type?: string
  start_at?: string
  end_at?: string
  current?: number
  size?: number
}) {
  return apiGet<PageResult<OrderItem>>('/admin/order/list', params)
}

export function getOrderDetail(id: string) {
  return apiGet<OrderItem>('/admin/order/detail', { id })
}

export function fulfillOrder(id: string) {
  return apiPost<OrderItem>('/admin/order/fulfill', { id })
}

export function listLedgers(params: {
  user_id?: string
  type?: string
  start_at?: string
  end_at?: string
  current?: number
  size?: number
}) {
  return apiGet<PageResult<LedgerItem>>('/admin/billing/ledger', params)
}

export function listConsume(params: {
  user_id?: string
  start_at?: string
  end_at?: string
  current?: number
  size?: number
}) {
  return apiGet<PageResult<LedgerItem>>('/admin/billing/consume', params)
}
