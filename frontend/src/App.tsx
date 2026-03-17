import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { useTranslation } from 'react-i18next'
import MainLayout from './layouts/MainLayout'
import AuthPage from './pages/Auth/AuthPage'
import AIChatPage from './pages/AIChatPage'
import AccountInfoPage from './pages/Account/AccountInfoPage'
import DocPage from './pages/DocPage'
import LegalSearchPage from './pages/LegalSearchPage'
import CaseSearchPage from './pages/CaseSearchPage'
import CaseReviewPage from './pages/CaseReviewPage'
import CompliancePage from './pages/CompliancePage'
import HistoryPage from './pages/HistoryPage'
import MembershipPage from './pages/MembershipPage'
import OrderListPage from './pages/OrderList/OrderListPage'
import PointsRecordPage from './pages/PointsRecordPage'
import { useThemeColor } from './hooks/useThemeColor'

// 引入 Ant Design 的语言包
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'

function App() {
  const { i18n } = useTranslation()
  const primaryColor = useThemeColor('--brand-primary', '#666cff')

  const solidFocusRing = `0 0 0 1px ${primaryColor}`

  // 监听 i18n 语言变化，同步切换 Antd 的语言
  const currentLang = i18n.language || 'zh'
  const antdLocale = currentLang.startsWith('en') ? enUS : zhCN

  const antdTheme = {
    token: {
      // 修改为截图中的品牌主色调（蓝紫）
      colorPrimary: primaryColor,
      // 统一设置圆角大小，匹配图上的卡片微圆角
      borderRadius: 8,
      // 背景色配置
      colorBgContainer: '#ffffff',
      colorBgLayout: '#f9fafb',
      controlOutline: 'none',
    },
    components: {
      // 针对特定组件的微调
      Menu: {
        itemSelectedBg: '#eef2ff', // 选中菜单的浅色背景
        itemSelectedColor: primaryColor,
      },
      Modal: {
        paddingContent: 0, // v6 中的全局 Token
      },
      Input: {
        activeShadow: solidFocusRing,
        hoverBorderColor: primaryColor,
        activeBorderColor: 'transparent',
      },
      DatePicker: {
        activeShadow: solidFocusRing,
        hoverBorderColor: primaryColor,
        activeBorderColor: 'transparent',
      },
      Select: {
        activeOutlineColor: 'transparent',
        activeShadow: solidFocusRing,
        hoverBorderColor: primaryColor,
        activeBorderColor: primaryColor,
      },
    },
  }
  return (
    <ConfigProvider locale={antdLocale} theme={antdTheme}>
      <BrowserRouter>
        <Routes>
          {/* 1. 不需要侧边栏的独立页面 */}
          <Route path='/login' element={<AuthPage />} />

          {/* 2. 需要侧边栏和顶部的页面，套在 MainLayout 下 */}
          <Route path='/' element={<MainLayout />}>
            {/* 当访问根路径 / 时，自动重定向到 /chat */}
            <Route index element={<Navigate to='/chat' replace />} />

            {/* 二级路由内容 */}
            <Route path='chat' element={<AIChatPage />} />
            <Route path='history' element={<HistoryPage />} />
            <Route path='account' element={<AccountInfoPage />}></Route>
            <Route path='doc' element={<DocPage />}></Route>
            <Route path='law' element={<LegalSearchPage />}></Route>
            <Route path='case_search' element={<CaseSearchPage />}></Route>
            <Route path='case_review' element={<CaseReviewPage />}></Route>
            <Route path='compliance' element={<CompliancePage />}></Route>
            <Route path='history' element={<HistoryPage />}></Route>
            <Route path='vip' element={<MembershipPage />}></Route>
            <Route path='orders' element={<OrderListPage />}></Route>
            <Route path='points' element={<PointsRecordPage />}></Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
