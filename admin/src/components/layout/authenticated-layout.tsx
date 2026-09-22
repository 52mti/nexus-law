import {
  LogoutOutlined,
  MenuOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Dropdown, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { navGroups } from '@/components/layout/nav-data'
import { useAuthStore } from '@/stores/auth-store'

const { Header, Sider, Content } = Layout

function collectUrls(items: { url: string }[]) {
  return items.map((item) => item.url)
}

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const clear = useAuthStore((s) => s.clear)

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

  const menuItems: MenuProps['items'] = groups.map((group) => ({
    type: 'group',
    key: group.title,
    label: group.title,
    children: group.items.map((item) => ({
      key: item.url,
      icon: <item.icon />,
      label: item.title,
    })),
  }))

  const urls = groups.flatMap((group) => collectUrls(group.items))
  const selected =
    urls
      .filter((url) => url !== '/' && (location.pathname === url || location.pathname.startsWith(`${url}/`)))
      .sort((a, b) => b.length - a.length)[0] || (location.pathname === '/' ? '/' : location.pathname)

  function logout() {
    clear()
    void navigate({ to: '/sign-in' })
  }

  function onMenuClick({ key }: { key: string }) {
    setOpen(false)
    void navigate({ to: key })
  }

  const sider = (
    <div className="flex h-full flex-col overflow-hidden">
      <Menu
        mode="inline"
        selectedKeys={[selected]}
        items={menuItems}
        onClick={onMenuClick}
        className="min-h-0 flex-1"
        style={{ borderInlineEnd: 'none', overflow: 'hidden' }}
      />
    </div>
  )

  return (
    <Layout className="h-svh overflow-hidden">
      <Header className="flex shrink-0 items-center justify-between border-b border-neutral-200 !bg-white !px-4 !text-neutral-900">
        <div className="flex h-14 items-center gap-2 px-4 font-semibold">
          <BankOutlined />
          Nexus Law
        </div>
        <Button type="text" className="md:!hidden" icon={<MenuOutlined />} onClick={() => setOpen(true)} />
        <div className="ml-auto flex items-center gap-2">
          <Dropdown
            menu={{
              items: [
                {
                  key: 'roles',
                  label: (profile?.role_codes || []).join(', ') || '未分配角色',
                  disabled: true,
                },
                { type: 'divider' },
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: logout,
                },
              ],
            }}
          >
            <Button>{profile?.nickname || profile?.phone || profile?.email || '管理员'}</Button>
          </Dropdown>
        </div>
      </Header>

      <Layout className="min-h-0 flex-1 overflow-hidden">
        <Sider
          breakpoint="md"
          collapsedWidth={0}
          trigger={null}
          width={256}
          className="admin-sider hidden !overflow-hidden md:!block"
        >
          {sider}
        </Sider>
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          placement="left"
          size={256}
          styles={{ body: { padding: 0, overflow: 'hidden', height: '100%' } }}
          className="md:hidden"
        >
          {sider}
        </Drawer>
        <Content className="min-h-0 overflow-auto !bg-neutral-100 p-4 md:p-6">{children}</Content>
      </Layout>
    </Layout>
  )
}
