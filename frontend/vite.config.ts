import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 1. 引入 Tailwind Vite 插件
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const BASE = '/nexus-law/'

// https://vitejs.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    // 2. 将其添加到插件列表中
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // 设置 @ 指向 src 目录的绝对路径
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // 避免 Windows 上只监听 [::1] 导致 localhost/127.0.0.1 访问异常
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // Vite 文档：使用非相对 base 时，proxy key 必须带上 base 前缀
      // 请求 /nexus-law/agent/api/* → 本地 NestJS /api/*
      [`${BASE}agent/api`]: {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(`${BASE}agent/api`, '/api'),
      },
      // 请求 /nexus-law/agent/* → 远程业务 API
      [`${BASE}agent`]: {
        target: 'https://api.sh-zktx.com',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(`${BASE}agent`, '/agent'),
      },
      // 兼容绝对路径 /agent（与生产 nginx.conf 一致）
      '/agent/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace('/agent/api', '/api'),
      },
      '/agent': {
        target: 'https://api.sh-zktx.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
