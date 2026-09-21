import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
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
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

export function PaginationBar({
  current,
  pages,
  total,
  onChange,
}: {
  current: number
  pages: number
  total: number
  onChange: (page: number) => void
}) {
  const safePages = Math.max(pages, 1)
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>共 {total} 条</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
        >
          <ChevronLeft />
          上一页
        </Button>
        <span>
          {current} / {safePages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={current >= safePages}
          onClick={() => onChange(current + 1)}
        >
          下一页
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

export function EmptyRow({ colSpan, text = '暂无数据' }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-muted-foreground">
        {text}
      </td>
    </tr>
  )
}
