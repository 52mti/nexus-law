import { App, ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import type { ReactNode } from 'react'
import { useTheme } from '@/components/theme-provider'

dayjs.locale('zh-cn')

export function AntdApp({ children }: { children: ReactNode }) {
  const { resolved } = useTheme()
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: resolved === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff' },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  )
}
