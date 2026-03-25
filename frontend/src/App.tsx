import { Suspense, lazy } from 'react' // 1. 引入 React 懒加载双雄
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd' // 引入 Spin 做加载动画
import type { ThemeConfig } from 'antd/lib/config-provider'
import { useTranslation } from 'react-i18next'
import { useThemeColor } from './hooks/useThemeColor'

// 引入 Ant Design 的语言包
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'

// 2. 静态引入核心骨架（千万别懒加载 Layout，否则一进页面连外壳都没有，体验极差）
import MainLayout from './layouts/MainLayout'

// ==========================================
// 3. 🚀 核心魔法：将所有页面级组件改为动态 import
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
  <div className='flex h-full w-full items-center justify-center min-h-[50vh]'>
    <Spin size='large' />
  </div>
)

function App() {
  const { i18n } = useTranslation()
  const primaryColor = useThemeColor('--brand-primary', '#666cff')

  const currentLang = i18n.language || 'zh'
  const antdLocale = currentLang.startsWith('en') ? enUS : zhCN

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
        {/* 4. 🚀 用 Suspense 包裹你的路由。当路由切换、页面文件还在下载时，就会展示 fallback 里的 Loading 动画 */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* 独立页面 */}
            <Route path='/login' element={<AuthPage />} />

            {/* MainLayout 里的嵌套页面 */}
            <Route path='/' element={<MainLayout />}>
              <Route index element={<Navigate to='/chat' replace />} />

              {/* 这里的子路由现在全部变成按需加载了！ */}
              <Route path='chat/:id?' element={<AIChatPage />} />
              <Route path='history' element={<HistoryPage />} />
              <Route path='account' element={<AccountInfoPage />} />
              <Route path='doc/:id?' element={<DocPage />} />
              <Route path='law' element={<LegalSearchPage />} />
              <Route path='case_search' element={<CaseSearchPage />} />
              <Route path='case_review' element={<CaseReviewPage />} />
              <Route path='compliance_review/:id?' element={<ComplianceReviewPage />} />
              {/* 注意：你原来代码里有两遍 history，这里我删掉了一个重复的 */}
              <Route path='vip' element={<MembershipPage />} />
              <Route path='orders' element={<OrderListPage />} />
              <Route path='points' element={<PointsRecordPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
