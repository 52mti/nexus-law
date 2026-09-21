import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export function PermissionGate({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  const allowed = useAuthStore((s) => s.hasPermission(permission))
  if (!allowed) return null
  return children
}
