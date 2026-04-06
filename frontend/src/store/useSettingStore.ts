// src/store/useSettingStore.ts
import { create } from 'zustand'

interface SettingItem {
  id: string
  name: string
  code: string
  value: string
  remarks?: string
  [key: string]: any
}

interface SettingState {
  settings: SettingItem[]
  // 💡 进阶技巧：提供一个通过 code 快速查找 value 的便捷方法
  getSettingValue: (code: string) => string | undefined
  getSettingName: (code: string) => string | undefined
  setSettings: (settings: SettingItem[]) => void
}

export const useSettingStore = create<SettingState>((set, get) => ({
  settings: [],
  getSettingValue: (code) => {
    const item = get().settings.find((s) => s.code === code)
    return item?.value
  },
  getSettingName: (code) => {
    const item = get().settings.find((s) => s.code === code)
    return item?.name
  },
  setSettings: (settings) => set({ settings }),
}))
