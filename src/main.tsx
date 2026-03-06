import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import App from './App.tsx'

import './index.css' // 你的基础 css（比如 tailwind 的引入）

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyleProvider layer>
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </StyleProvider>
  </React.StrictMode>,
)
