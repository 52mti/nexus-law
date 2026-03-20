import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 1. 引入 Tailwind Vite 插件
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
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
    proxy: {
      // 代理 /api 开头的请求到后端服务
      '/auth': {
        target: 'http://localhost:3000', // 后端服务地址，根据需要修改端口
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '/api'), // 保持路径不变，如需修改可调整
      },
    },
  },
})