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
})