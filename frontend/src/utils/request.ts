// src/utils/request.ts
import axios, { type AxiosResponse } from 'axios'
import { globalMessage } from '@/utils/globalAntd';
// 🚀 1. 核心：直接引入配置好的 i18n 实例（注意路径根据你的实际位置调整）
import i18n from '../i18n'; 

// ==========================================
// 定义后端响应格式
// ==========================================
interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// ==========================================
// 1. 创建属于你业务后端的专属 Axios 实例
// ==========================================
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 60 * 1000, // 10秒超时
})

// ==========================================
// 2. 请求拦截器 (发出去之前)
// ==========================================
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// ==========================================
// 3. 响应拦截器 (收回来之后)
// ==========================================
request.interceptors.response.use(
  <T,>(response: AxiosResponse<ApiResponse<T>>) => {
    return (response.data ? response.data : response) as T
  },
  (error) => {
    // 💣 捕获 HTTP 级别的致命错误 (500, 404, 跨域, 超时等)
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 🚀 2. 使用 i18n.t 替换中文
          globalMessage.error(i18n.t('error.token_expired'))
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 403:
          globalMessage.error(i18n.t('error.no_permission'))
          break
        case 404:
          globalMessage.error(i18n.t('error.not_found'))
          break
        case 500:
          globalMessage.error(i18n.t('error.server_error'))
          break
        default:
          // 🚀 3. 动态插值：把 HTTP 状态码作为变量传进去
          globalMessage.error(i18n.t('error.network_error_with_status', { status: error.response.status }))
      }
    } else if (error.message && error.message.includes('timeout')) {
      globalMessage.error(i18n.t('error.timeout'))
    } else {
      globalMessage.error(i18n.t('error.network_exception'))
    }

    return Promise.reject(error)
  },
)

export default request