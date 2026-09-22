import { BankOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { loginAdmin } from '@/api/auth'
import { canEnterAdmin, useAuthStore } from '@/stores/auth-store'

type FormValues = {
  contact: string
  password: string
}

function SignInPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  async function onFinish(values: FormValues) {
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
      message.error('无后台权限')
      return
    }
    setSession(result.access_token, profile)
    await navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <BankOutlined />
          Nexus Law 管理后台
        </div>
        <Typography.Title level={4}>管理员登录</Typography.Title>
        <Typography.Paragraph type="secondary">
          仅 super_admin / admin 可进入。Token 独立存储，不与 C 端共用。
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="contact" label="手机号或邮箱" rules={[{ required: true, message: '请输入手机号或邮箱' }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})
