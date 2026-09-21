import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { LogOut, Menu, Moon, Scale, Sun } from 'lucide-react'
import { useMemo, useState } from 'react'
import { navGroups } from '@/components/layout/nav-data'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const clear = useAuthStore((s) => s.clear)
  const { theme, setTheme } = useTheme()

  const groups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
        }))
        .filter((group) => group.items.length > 0),
    [hasPermission],
  )

  function logout() {
    clear()
    void navigate({ to: '/sign-in' })
  }

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 px-4 font-semibold">
        <Scale className="size-5" />
        Nexus Law
      </div>
      <Separator />
      <nav className="flex-1 space-y-4 overflow-auto p-3">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group.title}</div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active =
                  item.url === '/'
                    ? location.pathname === '/'
                    : location.pathname === item.url || location.pathname.startsWith(`${item.url}/`)
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent',
                      active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )

  return (
    <div className="flex min-h-svh">
      <div className="hidden md:block">{sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 h-full">{sidebar}</div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {profile?.nickname || profile?.phone || profile?.email || '管理员'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {(profile?.role_codes || []).join(', ') || '未分配角色'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
