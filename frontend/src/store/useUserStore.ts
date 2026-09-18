import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AuthResult, UserProfile } from '@/api/auth'

export interface UserState {
  user: UserProfile | null
  isAuthenticated: boolean
  memberInfo: UserProfile | null
  setUser: (user: UserProfile | null) => void
  setMemberInfo: (info: UserProfile | null) => void
  loginSuccess: (result: AuthResult) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        memberInfo: null,

        setUser: (user) => {
          set(
            {
              user,
              isAuthenticated: !!user,
            },
            false,
            'auth/setUser',
          )
        },

        setMemberInfo: (info) => {
          set(
            {
              memberInfo: info,
              ...(info ? { user: info, isAuthenticated: true } : {}),
            },
            false,
            'auth/setMemberInfo',
          )
        },

        loginSuccess: (result) => {
          localStorage.setItem('token', result.access_token)
          set(
            {
              user: result.user,
              memberInfo: result.user,
              isAuthenticated: true,
            },
            false,
            'auth/loginSuccess',
          )
        },

        logout: () => {
          localStorage.removeItem('token')
          set(
            {
              user: null,
              isAuthenticated: false,
              memberInfo: null,
            },
            false,
            'auth/logout',
          )
        },
      }),
      {
        name: 'user-storage',
      },
    ),
    { name: 'UserStore' },
  ),
)
