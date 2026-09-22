import { message } from 'antd'
import axios, { type AxiosRequestConfig } from 'axios'

export const TOKEN_KEY = 'admin_token'

export class ApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'ApiError'
  }
}

const UNAUTH_CODES = new Set([2000, 2001, 2002])

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function redirectToSignIn() {
  localStorage.removeItem(TOKEN_KEY)
  if (window.location.pathname !== '/sign-in') {
    window.location.assign('/sign-in')
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 60_000,
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const payload = response.data as { code?: number; data?: unknown; message?: string }
    if (payload && typeof payload.code === 'number') {
      if (payload.code === 0) return payload.data
      if (UNAUTH_CODES.has(payload.code)) {
        message.error(payload.message || '登录已过期')
        redirectToSignIn()
        throw new ApiError(payload.code, payload.message || '未登录')
      }
      if (payload.code === 3000) {
        message.error(payload.message || '无权限')
        throw new ApiError(payload.code, payload.message || '无权限')
      }
      message.error(payload.message || '请求失败')
      throw new ApiError(payload.code, payload.message || '请求失败')
    }
    return response.data
  },
  (error) => {
    const status = error.response?.status as number | undefined
    const text =
      error.response?.data?.message ||
      (status ? `网络错误 (${status})` : error.message) ||
      '网络错误'
    if (status === 401) {
      message.error('登录已过期')
      redirectToSignIn()
    } else {
      message.error(text)
    }
    throw new ApiError(status ?? 5000, text)
  },
)

export function apiGet<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig) {
  return http.get<unknown, T>(url, { ...config, params })
}

export function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
  return http.post<unknown, T>(url, body, config)
}

export function apiUpload<T>(url: string, form: FormData) {
  return http.post<unknown, T>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
