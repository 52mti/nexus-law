export const PERMISSION = {
  USER: 'user:manage',
  PROMPT: 'prompt:manage',
  AGENT: 'agent:manage',
  KB: 'kb:manage',
  PLAN: 'plan:manage',
  ORDER: 'order:manage',
  BILLING: 'billing:view',
  AUDIT: 'audit:view',
} as const

export type PermissionCode = (typeof PERMISSION)[keyof typeof PERMISSION]

export const ADMIN_ROLE_CODES = ['super_admin', 'admin'] as const
export const SUPER_ADMIN = 'super_admin'

export function isAdminRole(roleCodes: string[]) {
  return roleCodes.some((code) => (ADMIN_ROLE_CODES as readonly string[]).includes(code))
}

export function isSuperAdmin(roleCodes: string[]) {
  return roleCodes.includes(SUPER_ADMIN)
}

export function hasPermission(
  roleCodes: string[],
  permissionCodes: string[],
  code: string,
) {
  if (isSuperAdmin(roleCodes)) return true
  return permissionCodes.includes(code)
}
