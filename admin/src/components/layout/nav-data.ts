import {
  Bot,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  ScrollText,
  Shield,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { PERMISSION } from '@/lib/permissions'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  permission: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    title: '总览',
    items: [{ title: '工作台', url: '/', icon: LayoutDashboard, permission: '' }],
  },
  {
    title: '权限',
    items: [
      { title: '用户', url: '/users', icon: Users, permission: PERMISSION.USER },
      { title: '角色权限', url: '/roles', icon: Shield, permission: PERMISSION.USER },
    ],
  },
  {
    title: '运营',
    items: [
      { title: '提示词', url: '/prompts', icon: FileText, permission: PERMISSION.PROMPT },
      { title: 'Agent', url: '/agents', icon: Bot, permission: PERMISSION.AGENT },
      { title: '知识库', url: '/knowledge', icon: Database, permission: PERMISSION.KB },
    ],
  },
  {
    title: '账务',
    items: [
      { title: '套餐', url: '/plans', icon: CreditCard, permission: PERMISSION.PLAN },
      { title: '订单', url: '/orders', icon: ShoppingCart, permission: PERMISSION.ORDER },
      { title: '消费记录', url: '/billing', icon: Wallet, permission: PERMISSION.BILLING },
    ],
  },
  {
    title: '审计',
    items: [{ title: '操作日志', url: '/audit', icon: ScrollText, permission: PERMISSION.AUDIT }],
  },
]
