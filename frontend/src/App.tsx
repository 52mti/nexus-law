import { Suspense, lazy, useMemo } from 'react' // 🚀 1. 这里加了一个 useMemo
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import type { ThemeConfig } from 'antd/lib/config-provider'
import { useTranslation } from 'react-i18next'
import { useThemeColor } from './hooks/useThemeColor'

// 引入 Ant Design 的语言包
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
// 🚀 2. 引入我们刚才伪造的阿姆哈拉语包
import amET from './locales/antd-am-ET'

// 静态引入核心骨架
import MainLayout from './layouts/MainLayout'

// ==========================================
// 动态按需加载页面组件 (保持不变)
// ==========================================
const AuthPage = lazy(() => import('./pages/Auth/AuthPage'))
const AIChatPage = lazy(() => import('./pages/AIChatPage'))
const AccountInfoPage = lazy(() => import('./pages/Account/AccountInfoPage'))
const DocPage = lazy(() => import('./pages/DocPage'))
const LegalSearchPage = lazy(() => import('./pages/LegalSearchPage'))
const CaseSearchPage = lazy(() => import('./pages/CaseSearchPage'))
const CaseReviewPage = lazy(() => import('./pages/CaseReviewPage'))
const ComplianceReviewPage = lazy(() => import('./pages/ComplianceReviewPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const MembershipPage = lazy(() => import('./pages/MembershipPage'))
const OrderListPage = lazy(() => import('./pages/OrderListPage'))
const PointsRecordPage = lazy(() => import('./pages/PointsRecordPage'))

// 全局的加载动画组件
const PageLoader = () => (
  <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
    <Spin size="large" />
  </div>
)

function App() {
  const { i18n } = useTranslation()
  const primaryColor = useThemeColor('--brand-primary', '#666cff')

  // 🚀 3. 核心改造：使用 useMemo 动态匹配当前语言，支持阿姆哈拉语
  const antdLocale = useMemo(() => {
    const currentLang = i18n.language || 'zh-CN'

    if (currentLang.startsWith('en')) {
      return enUS
    } else if (currentLang === 'am-ET') {
      return amET
    }

    return zhCN // 默认兜底中文
  }, [i18n.language])

  // 主题配置 (保持不变)
  const antdTheme: ThemeConfig = {
    token: {
      colorPrimary: primaryColor,
      borderRadius: 8,
      colorBgContainer: '#ffffff',
      colorBgLayout: '#f9fafb',
      controlOutline: primaryColor,
      controlOutlineWidth: 1,
    },
    components: {
      Menu: { itemSelectedBg: '#eef2ff', itemSelectedColor: primaryColor },
      Input: {
        hoverBorderColor: primaryColor,
        activeBorderColor: 'transparent',
      },
      DatePicker: {
        hoverBorderColor: primaryColor,
        activeBorderColor: 'transparent',
      },
      Select: {
        hoverBorderColor: primaryColor,
        activeBorderColor: 'transparent',
      },
    },
  }

  return (
    <ConfigProvider locale={antdLocale} theme={antdTheme}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* 独立页面 */}
            <Route path="/login" element={<AuthPage />} />

            {/* MainLayout 里的嵌套页面 */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/chat" replace />} />

              {/* 子路由 */}
              <Route path="chat/:id?" element={<AIChatPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="account" element={<AccountInfoPage />} />
              <Route path="doc/:id?" element={<DocPage />} />
              <Route path="law" element={<LegalSearchPage />} />
              <Route path="case_search" element={<CaseSearchPage />} />
              <Route path="case_review" element={<CaseReviewPage />} />
              <Route path="compliance_review/:id?" element={<ComplianceReviewPage />} />
              <Route path="vip" element={<MembershipPage />} />
              <Route path="orders" element={<OrderListPage />} />
              <Route path="points" element={<PointsRecordPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
