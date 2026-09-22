import { App, ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import type { ReactNode } from 'react'

dayjs.locale('zh-cn')

export function AntdApp({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff' },
        components: {
          Layout: {
            headerBg: '#fff',
            headerColor: 'rgba(0, 0, 0, 0.88)',
            siderBg: '#fff',
            bodyBg: '#fff',
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  )
}
