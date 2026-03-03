import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import MainLayout from './layouts/MainLayout'
import { useTranslation } from 'react-i18next'

// 引入 Ant Design 的语言包
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'

// 页面组件占位
const ChatPage = () => <div>这里是 AI 对话界面</div>
const HistoryPage = () => <div>这里是 历史记录 界面（截图内容）</div>
const LoginPage = () => <div>独立登录页（没有侧边栏）</div>

function App() {
  const { i18n } = useTranslation()
  console.log(i18n)

  // 监听 i18n 语言变化，同步切换 Antd 的语言
  const currentLang = i18n.language || 'zh';
  const antdLocale = currentLang.startsWith('en') ? enUS : zhCN;

  const antdTheme = {
    token: {
      // 修改为截图中的品牌主色调（蓝紫）
      colorPrimary: '#5c6bc0',
      // 统一设置圆角大小，匹配图上的卡片微圆角
      borderRadius: 8,
      // 背景色配置
      colorBgContainer: '#ffffff',
      colorBgLayout: '#f9fafb',
    },
    components: {
      // 针对特定组件的微调
      Menu: {
        itemSelectedBg: '#eef2ff', // 选中菜单的浅色背景
        itemSelectedColor: '#5c6bc0',
      },
    },
  }
  return (
    <ConfigProvider locale={antdLocale} theme={antdTheme}>
      <BrowserRouter>
        <Routes>
          {/* 1. 不需要侧边栏的独立页面 */}
          <Route path='/login' element={<LoginPage />} />

          {/* 2. 需要侧边栏和顶部的页面，套在 MainLayout 下 */}
          <Route path='/' element={<MainLayout />}>
            {/* 当访问根路径 / 时，自动重定向到 /chat */}
            <Route index element={<Navigate to='/chat' replace />} />

            {/* 二级路由内容 */}
            <Route path='chat' element={<ChatPage />} />
            <Route path='history' element={<HistoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
