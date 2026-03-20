// src/utils/request.ts
import axios from 'axios'
import { message } from 'antd' // 依然使用 antd 帮你做优雅的全局提示

// ==========================================
// 1. 创建属于你业务后端的专属 Axios 实例
// ==========================================
const request = axios.create({
  // Vite 环境变量读取方式，如果没有则默认请求本地 3000 端口
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000, // 10秒超时
})

// ==========================================
// 2. 请求拦截器 (发出去之前)
// ==========================================
request.interceptors.request.use(
  (config) => {
    // 💡 未来这里是你给 NestJS/Java 传 Token 的地方
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
  (response) => {
    // 假设 NestJS / Java 统一返回的格式是：{ code: 200, data: {...}, msg: "成功" }
    const res = response.data

    // 🚀 核心魔法：判断业务状态码
    // 注意：这里的 200 是你后端自定义的业务 code，不是 HTTP 状态码
    if (res.code && res.code !== 200) {
      // 统一抛出业务报错，页面里不用再写 try-catch
      message.error(res.msg || res.message || '业务处理失败')

      // 如果 code 是 401，说明 Token 过期了，强制登出
      if (res.code === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login' // 强踢回登录页
      }

      return Promise.reject(new Error(res.msg || 'Error'))
    }

    // 正常情况，把最核心的 data 扒出来给组件用，极其干净！
    return res.data !== undefined ? res.data : res
  },
  (error) => {
    // 💣 捕获 HTTP 级别的致命错误 (500, 404, 跨域, 超时等)
    if (error.response) {
      switch (error.response.status) {
        case 401:
          message.error('登录已过期，请重新登录')
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 403:
          message.error('您没有权限访问该资源')
          break
        case 404:
          message.error('请求的接口不存在')
          break
        case 409:
          break
        case 500:
          message.error('服务器开了个小差，请稍后再试')
          break
        default:
          message.error(`网络请求错误: ${error.response.status}`)
      }
    } else if (error.message && error.message.includes('timeout')) {
      message.error('请求超时，请检查您的网络环境')
    } else {
      message.error('网络连接异常，请检查后端服务是否启动')
    }

    return Promise.reject(error)
  },
)

// 最后，把这个配置好的实例暴露出去！
export default request
