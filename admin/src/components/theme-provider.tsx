import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('admin_theme') as Theme) || 'system',
  )
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    typeof window === 'undefined' ? 'light' : resolveTheme((localStorage.getItem('admin_theme') as Theme) || 'system'),
  )

  useEffect(() => {
    const next = resolveTheme(theme)
    setResolved(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('admin_theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
