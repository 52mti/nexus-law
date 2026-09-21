import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { fetchAdminProfile } from '@/api/auth'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { TOKEN_KEY } from '@/lib/request'
import { canEnterAdmin, useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      throw redirect({ to: '/sign-in' })
    }
  },
  loader: async () => {
    const profile = await fetchAdminProfile()
    if (!canEnterAdmin(profile)) {
      useAuthStore.getState().clear()
      throw redirect({ to: '/sign-in' })
    }
    useAuthStore.getState().setProfile(profile)
    return profile
  },
  component: () => (
    <AuthenticatedLayout>
      <Outlet />
    </AuthenticatedLayout>
  ),
})
