import React, { useState, useEffect } from 'react'
import { Table, App } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { ContainerOutlined } from '@ant-design/icons'
import Copiright from '@/components/Copiright'
import { PageContainer } from '@/components/layout/PageContainer'

// 🚀 1. 引入真实 API
import { pageList } from '@/api/order'

// 引入刚刚写好的两个弹窗组件
import { PaymentModal } from '@/components/PaymentModal'
import { PaymentSuccessModal } from '@/components/PaymentSuccessModal'

// ==========================================
// 1. 类型定义
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
        pending: { text: '等待付款', dotClass: 'bg-primary', textClass: 'text-gray-800' },
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
          <span
            className='text-primary hover:text-secondary cursor-pointer transition-colors'
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
// 🚀 核心转换函数：后端状态码 -> 前端 UI 状态
// ==========================================
const mapOrderStatus = (backendStatus: string): OrderStatus => {
  switch (backendStatus) {
    case 'W': return 'pending'   // Wait - 待支付
    case 'S': return 'success'   // Success - 支付成功
    case 'C': return 'cancelled' // Cancelled - 已取消
    default: return 'pending'    // 兜底
  }
}

// ==========================================
// 🚀 核心转换函数：后端订单类目 -> 前端 UI 文本
// ==========================================
const mapOrderCategory = (category: string): string => {
  switch (category) {
    case 'POINTS': return '购买积分'
    case 'MEMBER': return '购买高级会员'
    default: return '购买服务' // 兜底防抖，防止后端增加新类型前端显示空白
  }
}

// ==========================================
// 3. 主页面组件
// ==========================================
export const OrderListPage: React.FC = () => {
  const { message } = App.useApp()

  // 状态管理
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<OrderRecord[]>([])

  // 分页管理
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  // 管理弹窗状态与当前订单
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<OrderRecord | null>(null)

  // 请求订单列表接口
  const fetchOrderList = async (current = 1, size = 10) => {
    setLoading(true)
    try {
      // 调用你的 API，传入分页参数
      const res = await pageList({ current, size })

      if (res.successful && res.data) {
        // 将后端的原始数据映射为表格需要的格式
        const formattedOrders: OrderRecord[] = res.data.records.map((item: any) => ({
          key: item.id, // antd 表格必需的 key
          orderId: item.id,
          // 🚀 使用新增的映射函数处理 orderCategory
          orderType: mapOrderCategory(item.orderCategory),
          amount: item.amount,
          status: mapOrderStatus(item.status), // 转换状态码 "W" -> "pending"
          orderTime: item.createTime || '-',
          payTime: item.effectiveDate || '-', // 如果支付成功，通常 effectiveDate 就是支付生效时间
          payMethod: item.payType || '-',
        }))

        setOrders(formattedOrders)
        setPagination(prev => ({
          ...prev,
          current: res.data.current,
          total: res.data.total,
        }))
      } else {
        message.error(res.message || '获取订单列表失败')
      }
    } catch (error) {
      console.error('获取订单列表异常:', error)
      message.error('网络异常，无法获取订单信息')
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时拉取第一页数据
  useEffect(() => {
    fetchOrderList(pagination.current, pagination.pageSize)
  }, [])

  // 监听表格底部的分页器点击事件
  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchOrderList(newPagination.current || 1, newPagination.pageSize || 10)
    // 更新本地分页状态，主要是为了切换 pageSize 时记住
    setPagination(prev => ({
      ...prev,
      pageSize: newPagination.pageSize || 10,
    }))
  }

  // 点击“立即支付”时的处理逻辑
  const handlePayClick = (record: OrderRecord) => {
    setCurrentOrder(record)
    setIsPaymentModalOpen(true)
  }

  // 为了方便你做 UI 演示，加一个黑科技：打开扫码框 3 秒后，自动模拟支付成功！
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPaymentModalOpen) {
      timer = setTimeout(() => {
        setIsPaymentModalOpen(false)
        setIsSuccessModalOpen(true)
        message.success('模拟支付成功！')
        // 支付成功后，重新刷新一下当前页的列表状态！
        fetchOrderList(pagination.current, pagination.pageSize)
      }, 3000)
    }
    return () => clearTimeout(timer)
  }, [isPaymentModalOpen])

  return (
    <PageContainer>
      <div className='flex-1 flex flex-col overflow-hidden animate-fade-in'>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 pb-2 mb-6 flex-1 flex flex-col'>
          <div className='flex items-center gap-2 mb-6 px-2'>
            <ContainerOutlined className='text-primary text-lg' />
            <span className='text-[16px] font-bold text-gray-800'>订单列表</span>
          </div>

          <div className='flex-1 [&_.ant-table-thead>tr>th]:bg-[#f7f8fb] [&_.ant-table-thead>tr>th]:text-gray-600 [&_.ant-table-thead>tr>th]:font-bold [&_.ant-table-thead>tr>th]:border-b-0 [&_.ant-table-cell]:py-4'>
            <Table
              columns={getColumns(handlePayClick)}
              dataSource={orders} // 使用真实数据
              loading={loading}   // 加上加载遮罩
              onChange={handleTableChange} // 绑定分页切换事件
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                placement: ['bottomCenter'],
                showSizeChanger: true,
                className: 'mt-8 mb-4',
              }}
              rowClassName='hover:bg-gray-50/50 transition-colors'
            />
          </div>
        </div>

        <Copiright />

        {/* ========================================== */}
        {/* 弹窗挂载区域 */}
        {/* ========================================== */}

        {/* 1. 扫码支付弹窗 */}
        <PaymentModal
          open={isPaymentModalOpen}
          onCancel={() => setIsPaymentModalOpen(false)}
          amount={currentOrder?.amount || 0}
          orderId={currentOrder?.orderId || ''}
        />

        {/* 2. 支付成功弹窗 */}
        <PaymentSuccessModal
          open={isSuccessModalOpen}
          onCancel={() => setIsSuccessModalOpen(false)}
          amount={currentOrder?.amount.toFixed(2) || '0.00'}
          payMethod="微信/支付宝"
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