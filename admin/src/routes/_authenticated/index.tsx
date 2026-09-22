import { Card, Typography } from 'antd'
import { Link, createFileRoute } from '@tanstack/react-router'
import { navGroups } from '@/components/layout/nav-data'
import { PageHeader } from '@/components/page'
import { useAuthStore } from '@/stores/auth-store'

function HomePage() {
  const profile = useAuthStore((s) => s.profile)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const modules = navGroups
    .flatMap((group) => group.items)
    .filter((item) => item.url !== '/' && (!item.permission || hasPermission(item.permission)))

  return (
    <div>
      <PageHeader
        title="工作台"
        description={`你好，${profile?.nickname || profile?.phone || profile?.email || '管理员'}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((item) => (
          <Link key={item.url} to={item.url as never} className="block">
            <Card hoverable>
              <Typography.Title level={5} className="!mb-1 flex items-center gap-2">
                <item.icon />
                {item.title}
              </Typography.Title>
              <Typography.Text type="secondary">进入{item.title}管理</Typography.Text>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
})
