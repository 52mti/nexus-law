import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

import './index.css' // 你的基础 css（比如 tailwind 的引入）

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
