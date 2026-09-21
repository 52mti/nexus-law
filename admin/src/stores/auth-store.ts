import { create } from 'zustand'
import { hasPermission, isAdminRole, isSuperAdmin } from '@/lib/permissions'
import { TOKEN_KEY } from '@/lib/request'
import type { AdminProfile } from '@/lib/types'

interface AuthState {
  token: string | null
  profile: AdminProfile | null
  setSession: (token: string, profile: AdminProfile) => void
  setProfile: (profile: AdminProfile) => void
  clear: () => void
  hasPermission: (code: string) => boolean
  isSuperAdmin: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  profile: null,
  setSession: (token, profile) => {
    localStorage.setItem(TOKEN_KEY, token)
    set({ token, profile })
  },
  setProfile: (profile) => set({ profile }),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, profile: null })
  },
  hasPermission: (code) => {
    const profile = get().profile
    if (!profile) return false
    return hasPermission(profile.role_codes || [], profile.permission_codes || [], code)
  },
  isSuperAdmin: () => isSuperAdmin(get().profile?.role_codes || []),
}))

export function canEnterAdmin(profile: AdminProfile | null) {
  if (!profile) return false
  return isAdminRole(profile.role_codes || [])
}
