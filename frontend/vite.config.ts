import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 1. 引入 Tailwind Vite 插件
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const SERVER_URL = 'http://101.200.206.159:8000/'

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
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
      '/api': {
        target: SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
