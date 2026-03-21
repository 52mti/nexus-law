import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AuthResponse } from '@/api/auth'

export interface UserState {
  user: AuthResponse | null
  isAuthenticated: boolean
  setUser: (user: AuthResponse | null) => void
  logout: () => void
}

// 💡 注意中间件的嵌套顺序：create -> devtools -> persist
export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,

        setUser: (user) => {
          // 💡 第三个参数是给 Redux DevTools 显示的 Action 名字，极大地提升调试体验
          set(
            {
              user,
              isAuthenticated: !!user,
            },
            false,
            'auth/setUser'
          )
        },

        logout: () => {
          set(
            {
              user: null,
              isAuthenticated: false,
            },
            false,
            'auth/logout'
          )
        },
      }),
      {
        name: 'user-storage', // 💡 localStorage 中存储的 key 的名字
        // persist 中间件会自动帮你处理 localStorage 的存取，不需要手动写 setItem/removeItem 了！
      }
    ),
    { name: 'UserStore' } // 💡 Redux DevTools 中显示的 Store 名字
  )
)