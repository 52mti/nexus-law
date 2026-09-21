import { useForm } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Scale } from 'lucide-react'
import { loginAdmin } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { canEnterAdmin, useAuthStore } from '@/stores/auth-store'
import { createFileRoute } from '@tanstack/react-router'

const schema = z.object({
  contact: z.string().min(1, '请输入手机号或邮箱'),
  password: z.string().min(1, '请输入密码'),
})

type FormValues = z.infer<typeof schema>

function SignInPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contact: '', password: '' },
  })

  async function onSubmit(values: FormValues) {
    const contact = values.contact.trim()
    const isEmail = contact.includes('@')
    const result = await loginAdmin({
      login_type: 'password',
      password: values.password,
      ...(isEmail ? { email: contact } : { phone: contact }),
    })
    const profile = {
      ...result.user,
      permission_codes: result.permission_codes || result.user.permission_codes || [],
    }
    if (!canEnterAdmin(profile)) {
      throw new Error('无后台权限')
    }
    setSession(result.access_token, profile)
    await navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <Scale className="size-5" />
            Nexus Law 管理后台
          </div>
          <CardTitle>管理员登录</CardTitle>
          <CardDescription>仅 super_admin / admin 可进入。Token 独立存储，不与 C 端共用。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <Label htmlFor="contact">手机号或邮箱</Label>
              <Input id="contact" autoComplete="username" {...form.register('contact')} />
              {form.formState.errors.contact ? (
                <p className="text-xs text-destructive">{form.formState.errors.contact.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? '登录中…' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})
