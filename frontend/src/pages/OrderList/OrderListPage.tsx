import React, { useState, useEffect } from 'react'
import { Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ContainerOutlined } from '@ant-design/icons'
import Copiright from '@/components/Copiright'
import { PageContainer } from '@/components/layout/PageContainer'

// 🚀 1. 引入刚刚写好的两个弹窗组件
import { PaymentModal } from './PaymentModal'
import { PaymentSuccessModal } from './PaymentSuccessModal'

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
  { key: '1', orderId: '2025062264169', orderType: '购买钻石会员1年', amount: 799, status: 'pending', orderTime: '2025-06-22 12:00', payTime: '-', payMethod: '-' },
  { key: '2', orderId: '2025062264169', orderType: '购买钻石会员1年', amount: 799, status: 'cancelled', orderTime: '2025-06-22 12:00', payTime: '-', payMethod: '-' },
  { key: '3', orderId: '2025062264169', orderType: '购买钻石会员1年', amount: 799, status: 'success', orderTime: '2025-06-22 12:00', payTime: '2025-06-22 12:05', payMethod: '支付宝' },
  { key: '4', orderId: '2025062264169', orderType: '购买铂金会员1年', amount: 599, status: 'success', orderTime: '2025-06-20 13:00', payTime: '2025-06-20 14:05', payMethod: '支付宝' },
  { key: '5', orderId: '2025062264169', orderType: '购买铂金会员1年', amount: 599, status: 'success', orderTime: '2025-06-20 13:00', payTime: '2025-06-20 14:05', payMethod: '支付宝' },
]

// ==========================================
// 2. 表格列配置 (改为函数返回，以便接收点击事件)
// ==========================================
const getColumns = (onPayClick: (record: OrderRecord) => void): ColumnsType<OrderRecord> => [
  { title: '订单编号', dataIndex: 'orderId', key: 'orderId', className: 'text-gray-600' },
  { title: '订单类型', dataIndex: 'orderType', key: 'orderType', className: 'text-gray-600' },
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
      const statusConfig = {
        pending: { text: '等待付款', dotClass: 'bg-[#666cff]', textClass: 'text-gray-800' },
        cancelled: { text: '订单取消', dotClass: 'bg-gray-400', textClass: 'text-gray-500' },
        success: { text: '支付成功', dotClass: 'bg-emerald-500', textClass: 'text-gray-800' },
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
  { title: '下单时间', dataIndex: 'orderTime', key: 'orderTime', className: 'text-gray-600' },
  { title: '支付时间', dataIndex: 'payTime', key: 'payTime', className: 'text-gray-600' },
  { title: '支付方式', dataIndex: 'payMethod', key: 'payMethod', className: 'text-gray-600' },
  {
    title: '操作',
    key: 'action',
    render: (_, record) => {
      if (record.status === 'pending') {
        return (
          // 🚀 触发外部传入的点击事件
          <span 
            className='text-[#666cff] hover:text-[#585ee6] cursor-pointer transition-colors'
            onClick={() => onPayClick(record)}
          >
            立即支付
          </span>
        )
      }
      return null
    },
  },
]

// ==========================================
// 3. 主页面组件
// ==========================================
export const OrderListPage: React.FC = () => {
  // 🚀 管理弹窗状态与当前订单
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<OrderRecord | null>(null)

  // 点击“立即支付”时的处理逻辑
  const handlePayClick = (record: OrderRecord) => {
    setCurrentOrder(record)
    setIsPaymentModalOpen(true)
  }

  // 🚀 为了方便你做 UI 演示，加一个黑科技：打开扫码框 3 秒后，自动模拟支付成功！
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPaymentModalOpen) {
      timer = setTimeout(() => {
        setIsPaymentModalOpen(false) // 关掉扫码框
        setIsSuccessModalOpen(true)  // 打开成功框
        message.success('模拟支付成功！')
      }, 3000)
    }
    return () => clearTimeout(timer)
  }, [isPaymentModalOpen])

  return (
    <PageContainer>
      <div className='flex-1 flex flex-col overflow-hidden animate-fade-in'>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 pb-2 mb-6 flex-1 flex flex-col'>
        <div className='flex items-center gap-2 mb-6 px-2'>
          <ContainerOutlined className='text-[#666cff] text-lg' />
          <span className='text-[16px] font-bold text-gray-800'>订单列表</span>
        </div>

        <div className='flex-1 [&_.ant-table-thead>tr>th]:bg-[#f7f8fb] [&_.ant-table-thead>tr>th]:text-gray-600 [&_.ant-table-thead>tr>th]:font-bold [&_.ant-table-thead>tr>th]:border-b-0 [&_.ant-table-cell]:py-4'>
          <Table
            // 🚀 将处理函数传给 columns
            columns={getColumns(handlePayClick)}
            dataSource={mockOrders}
            pagination={{
              position: ['bottomCenter'],
              defaultCurrent: 1,
              total: 50, 
              showSizeChanger: false,
              className: 'mt-8 mb-4',
            }}
            rowClassName='hover:bg-gray-50/50 transition-colors'
          />
        </div>
      </div>

      <Copiright />

      {/* ========================================== */}
      {/* 🚀 弹窗挂载区域 */}
      {/* ========================================== */}

      {/* 1. 扫码支付弹窗 */}
      <PaymentModal
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        amount={currentOrder?.amount || 0}
      />

      {/* 2. 支付成功弹窗 */}
      <PaymentSuccessModal
        open={isSuccessModalOpen}
        onCancel={() => setIsSuccessModalOpen(false)}
        // 保证金额格式是 "599.00"，配合弹窗内的 split 拆分逻辑
        amount={currentOrder?.amount.toFixed(2) || '0.00'}
        payMethod="支付宝"
        // 动态获取当前时间作为支付时间展示
        payTime={new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')}
        onReturnHome={() => {
          setIsSuccessModalOpen(false)
          message.info('返回首页逻辑...')
        }}
      />
    </div>
    </PageContainer>
  )
}

export default OrderListPage