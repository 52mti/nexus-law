import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import App from './App.tsx'
import { AntdGlobalContext } from './components/AntdGlobalContext'

import './index.css' // 你的基础 css（比如 tailwind 的引入）

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyleProvider layer>
      <ConfigProvider>
        <AntdApp>
          <AntdGlobalContext />
          <App />
        </AntdApp>
      </ConfigProvider>
    </StyleProvider>
  </React.StrictMode>,
)
