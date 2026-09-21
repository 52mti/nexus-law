import { Link, createFileRoute } from '@tanstack/react-router'
import { navGroups } from '@/components/layout/nav-data'
import { PageHeader } from '@/components/page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
            <Card className="h-full transition-colors hover:bg-accent/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <item.icon className="size-4" />
                  {item.title}
                </CardTitle>
                <CardDescription>进入{item.title}管理</CardDescription>
              </CardHeader>
              <CardContent />
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
