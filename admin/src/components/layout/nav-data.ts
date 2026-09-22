import {
  AuditOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import type { ComponentType } from 'react'
import { PERMISSION } from '@/lib/permissions'

export interface NavItem {
  title: string
  url: string
  icon: ComponentType
  permission: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    title: '总览',
    items: [{ title: '工作台', url: '/', icon: DashboardOutlined, permission: '' }],
  },
  {
    title: '权限',
    items: [
      { title: '用户', url: '/users', icon: UserOutlined, permission: PERMISSION.USER },
      { title: '角色权限', url: '/roles', icon: SafetyCertificateOutlined, permission: PERMISSION.USER },
    ],
  },
  {
    title: '运营',
    items: [
      { title: '提示词', url: '/prompts', icon: FileTextOutlined, permission: PERMISSION.PROMPT },
      { title: 'Agent', url: '/agents', icon: RobotOutlined, permission: PERMISSION.AGENT },
      { title: '知识库', url: '/knowledge', icon: DatabaseOutlined, permission: PERMISSION.KB },
    ],
  },
  {
    title: '账务',
    items: [
      { title: '套餐', url: '/plans', icon: CreditCardOutlined, permission: PERMISSION.PLAN },
      { title: '订单', url: '/orders', icon: ShoppingCartOutlined, permission: PERMISSION.ORDER },
      { title: '消费记录', url: '/billing', icon: WalletOutlined, permission: PERMISSION.BILLING },
    ],
  },
  {
    title: '审计',
    items: [{ title: '操作日志', url: '/audit', icon: AuditOutlined, permission: PERMISSION.AUDIT }],
  },
]
