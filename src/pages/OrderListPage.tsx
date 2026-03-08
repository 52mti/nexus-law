import React from 'react'
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ContainerOutlined } from '@ant-design/icons'
import Copiright from '@/components/Copiright'

// ==========================================
// 1. 类型定义与模拟数据
// ==========================================
type OrderStatus = 'pending' | 'cancelled' | 'success'

interface OrderRecord {
  key: string
  orderId: string
  orderType: string
  amount: number
  status: OrderStatus
  orderTime: string
  payTime: string
  payMethod: string
}

const mockOrders: OrderRecord[] = [
  {
    key: '1',
    orderId: '2025062264169',
    orderType: '购买钻石会员1年',
    amount: 799,
    status: 'pending',
    orderTime: '2025-06-22 12:00',
    payTime: '-',
    payMethod: '-',
  },
  {
    key: '2',
    orderId: '2025062264169',
    orderType: '购买钻石会员1年',
    amount: 799,
    status: 'cancelled',
    orderTime: '2025-06-22 12:00',
    payTime: '-',
    payMethod: '-',
  },
  {
    key: '3',
    orderId: '2025062264169',
    orderType: '购买钻石会员1年',
    amount: 799,
    status: 'success',
    orderTime: '2025-06-22 12:00',
    payTime: '2025-06-22 12:05',
    payMethod: '支付宝',
  },
  {
    key: '4',
    orderId: '2025062264169',
    orderType: '购买铂金会员1年',
    amount: 599,
    status: 'success',
    orderTime: '2025-06-20 13:00',
    payTime: '2025-06-20 14:05',
    payMethod: '支付宝',
  },
  {
    key: '5',
    orderId: '2025062264169',
    orderType: '购买铂金会员1年',
    amount: 599,
    status: 'success',
    orderTime: '2025-06-20 13:00',
    payTime: '2025-06-20 14:05',
    payMethod: '支付宝',
  },
  {
    key: '6',
    orderId: '2025062264169',
    orderType: '购买铂金会员1年',
    amount: 599,
    status: 'success',
    orderTime: '2025-06-20 13:00',
    payTime: '2025-06-20 14:05',
    payMethod: '支付宝',
  },
  {
    key: '7',
    orderId: '2025062264169',
    orderType: '购买铂金会员1年',
    amount: 599,
    status: 'success',
    orderTime: '2025-06-20 13:00',
    payTime: '2025-06-20 14:05',
    payMethod: '支付宝',
  },
  {
    key: '8',
    orderId: '2025062264169',
    orderType: '购买钻石会员1年',
    amount: 799,
    status: 'success',
    orderTime: '2025-06-22 12:00',
    payTime: '2025-06-22 12:05',
    payMethod: '支付宝',
  },
]

// ==========================================
// 2. 表格列配置 (Columns)
// ==========================================
const columns: ColumnsType<OrderRecord> = [
  {
    title: '订单编号',
    dataIndex: 'orderId',
    key: 'orderId',
    className: 'text-gray-600',
  },
  {
    title: '订单类型',
    dataIndex: 'orderType',
    key: 'orderType',
    className: 'text-gray-600',
  },
  {
    title: '付款金额',
    dataIndex: 'amount',
    key: 'amount',
    render: (amount: number) => (
      <span className='text-gray-800 font-medium'>¥ {amount}</span>
    ),
  },
  {
    title: '订单状态',
    dataIndex: 'status',
    key: 'status',
    render: (status: OrderStatus) => {
      // 根据状态动态返回对应颜色的小圆点和文字
      const statusConfig = {
        pending: {
          text: '等待付款',
          dotClass: 'bg-[#666cff]',
          textClass: 'text-gray-800',
        },
        cancelled: {
          text: '订单取消',
          dotClass: 'bg-gray-400',
          textClass: 'text-gray-500',
        },
        success: {
          text: '支付成功',
          dotClass: 'bg-emerald-500',
          textClass: 'text-gray-800',
        },
      }
      const config = statusConfig[status]

      return (
        <div className='flex items-center gap-2'>
          <div className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
          <span className={config.textClass}>{config.text}</span>
        </div>
      )
    },
  },
  {
    title: '下单时间',
    dataIndex: 'orderTime',
    key: 'orderTime',
    className: 'text-gray-600',
  },
  {
    title: '支付时间',
    dataIndex: 'payTime',
    key: 'payTime',
    className: 'text-gray-600',
  },
  {
    title: '支付方式',
    dataIndex: 'payMethod',
    key: 'payMethod',
    className: 'text-gray-600',
  },
  {
    title: '操作',
    key: 'action',
    render: (_, record) => {
      // 只有状态为 pending 的才有“立即支付”的操作按钮
      if (record.status === 'pending') {
        return (
          <span className='text-[#666cff] hover:text-[#585ee6] cursor-pointer transition-colors'>
            立即支付
          </span>
        )
      }
      return null // 其他状态没有操作项
    },
  },
]

// ==========================================
// 3. 主页面组件
// ==========================================
export const OrderListPage: React.FC = () => {
  return (
    <div className='min-h-full bg-[#f9fafb] p-6 flex flex-col animate-fade-in'>
      {/* 核心卡片容器 */}
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 pb-2 mb-6 flex-1 flex flex-col'>
        {/* 卡片头部标题 */}
        <div className='flex items-center gap-2 mb-6 px-2'>
          <ContainerOutlined className='text-[#666cff] text-lg' />
          <span className='text-[16px] font-bold text-gray-800'>订单列表</span>
        </div>

        {/* 🚀 表格区域 
          黑科技：使用 Tailwind 4 的 [&_...] 语法直接穿透覆写 Antd 的默认表头样式。
          把表头背景色改为极淡的灰色，文字居中或靠左，去除了底边框以外的冗余线条。
        */}
        <div className='flex-1 [&_.ant-table-thead>tr>th]:bg-[#f7f8fb] [&_.ant-table-thead>tr>th]:text-gray-600 [&_.ant-table-thead>tr>th]:font-bold [&_.ant-table-thead>tr>th]:border-b-0 [&_.ant-table-cell]:py-4'>
          <Table
            columns={columns}
            dataSource={mockOrders}
            pagination={{
              position: ['bottomCenter'], // 分页器底部居中
              defaultCurrent: 1,
              total: 500, // 模拟共50页，每页10条
              showSizeChanger: false, // 隐藏"10条/页"的选择器以匹配原型
              className: 'mt-8 mb-4',
            }}
            rowClassName='hover:bg-gray-50/50 transition-colors' // 数据行悬浮效果
          />
        </div>
      </div>

      {/* 底部版权信息 */}
      <Copiright />
    </div>
  )
}

export default OrderListPage
