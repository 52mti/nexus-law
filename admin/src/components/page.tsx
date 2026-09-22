import type { ReactNode } from 'react'
import { Space, Typography } from 'antd'
import type { TablePaginationConfig } from 'antd'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-sm">{label}</div>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
      </div>
      {children ? <Space wrap>{children}</Space> : null}
    </div>
  )
}

export function tablePagination(
  data: { current?: number; total?: number } | undefined,
  current: number,
  onChange: (page: number) => void,
  pageSize = 20,
): TablePaginationConfig {
  return {
    current: data?.current || current,
    pageSize,
    total: data?.total || 0,
    showSizeChanger: false,
    showTotal: (total) => `共 ${total} 条`,
    onChange,
  }
}
