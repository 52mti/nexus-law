import React from 'react'
import { Pagination } from 'antd'
import { ProfileOutlined } from '@ant-design/icons'
import Copiright from '@/components/Copiright'
import { PageContainer } from '@/components/layout/PageContainer'

// ==========================================
// 1. 类型定义与模拟数据
// ==========================================
interface PointRecord {
  id: string
  title: string
  time: string
  change: string
  remaining: string
}

const mockRecords: PointRecord[] = [
  {
    id: '1',
    title: '登录赠送积分',
    time: '2026-06-15 12:00',
    change: '+10',
    remaining: '+1200',
  },
  {
    id: '2',
    title: '产品消耗积分',
    time: '2026-06-15 12:00',
    change: '+10',
    remaining: '+1200',
  },
  {
    id: '3',
    title: '登录赠送积分',
    time: '2026-06-15 12:00',
    change: '+10',
    remaining: '+1200',
  },
  {
    id: '4',
    title: '产品消耗积分',
    time: '2026-06-15 12:00',
    change: '+10',
    remaining: '+1200',
  },
  {
    id: '5',
    title: '登录赠送积分',
    time: '2026-06-15 12:00',
    change: '+10',
    remaining: '+1200',
  },
  {
    id: '6',
    title: '产品消耗积分',
    time: '2026-06-15 12:00',
    change: '+10',
    remaining: '+1200',
  },
  {
    id: '7',
    title: '登录赠送积分',
    time: '2026-06-15 12:00',
    change: '+10',
    remaining: '+1200',
  },
  {
    id: '8',
    title: '产品消耗积分',
    time: '2026-06-15 12:00',
    change: '+10',
    remaining: '+1200',
  },
]

// ==========================================
// 2. 页面主组件
// ==========================================
export const PointsRecordPage: React.FC = () => {
  return (
    <PageContainer>
      <div className='flex flex-col animate-fade-in'>
      {/* 核心白底容器 */}
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8 pb-6 mb-6 flex-1 flex flex-col'>
        {/* ========================================== */}
        {/* 1. 头部标题 */}
        {/* ========================================== */}
        <div className='flex items-center gap-2 mb-6'>
          <ProfileOutlined className='text-[#666cff] text-xl' />
          <span className='text-[16px] font-bold text-gray-800'>积分记录</span>
        </div>

        {/* ========================================== */}
        {/* 2. 顶部概览数据板 (Summary Board) */}
        {/* ========================================== */}
        <div className='bg-[#f7f8fb] rounded-xl py-6 px-10 mb-8 flex items-center justify-between'>
          {/* 剩余积分 */}
          <div className='flex flex-col'>
            <div className='flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium'>
              <div className='w-1.5 h-1.5 bg-[#666cff]' /> 剩余积分
            </div>
            <div className='text-2xl font-black text-gray-800 pl-3'>1200</div>
          </div>

          <div className='text-gray-400 font-medium text-lg'>=</div>

          {/* 充值积分 */}
          <div className='flex flex-col'>
            <div className='flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium'>
              <div className='w-1.5 h-1.5 bg-[#666cff]' /> 充值积分
            </div>
            <div className='text-xl font-bold text-gray-800 pl-3'>1080</div>
          </div>

          <div className='text-gray-400 font-medium text-lg'>+</div>

          {/* 赠送积分 */}
          <div className='flex flex-col'>
            <div className='flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium'>
              <div className='w-1.5 h-1.5 bg-[#666cff]' /> 赠送积分
            </div>
            <div className='text-xl font-bold text-gray-800 pl-3'>200</div>
          </div>

          <div className='text-gray-400 font-medium text-lg'>-</div>

          {/* 消耗积分 */}
          <div className='flex flex-col'>
            <div className='flex items-center gap-2 mb-2 text-[14px] text-gray-500 font-medium'>
              <div className='w-1.5 h-1.5 bg-[#666cff]' /> 消耗积分
            </div>
            <div className='text-xl font-bold text-gray-800 pl-3'>150</div>
          </div>
        </div>

        {/* ========================================== */}
        {/* 3. 数据卡片列表 (Card List) */}
        {/* ========================================== */}
        <div className='flex flex-col gap-3 flex-1 mb-8'>
          {mockRecords.map((record, index) => (
            <div
              key={`${record.id}-${index}`}
              className='flex items-center justify-between p-5 rounded-xl border border-gray-100 bg-white hover:border-[#666cff]/30 hover:shadow-[0_2px_8px_rgba(102,108,255,0.08)] transition-all group'
            >
              {/* 左侧：操作名称与时间 */}
              <div className='flex flex-col gap-1.5'>
                <span className='text-[15px] font-bold text-gray-800 group-hover:text-[#666cff] transition-colors'>
                  {record.title}
                </span>
                <span className='text-[13px] text-gray-400'>{record.time}</span>
              </div>

              {/* 右侧：数值变化 */}
              <div className='flex items-center gap-16 pr-4'>
                {/* 积分变化 */}
                <div className='flex flex-col gap-1.5 items-end'>
                  <span className='text-[13px] text-gray-500'>积分变化</span>
                  <span className='text-[15px] font-bold text-gray-800'>
                    {record.change}
                  </span>
                </div>
                {/* 剩余积分 */}
                <div className='flex flex-col gap-1.5 items-end w-16'>
                  <span className='text-[13px] text-gray-500'>剩余积分</span>
                  <span className='text-[15px] font-bold text-gray-800'>
                    {record.remaining}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ========================================== */}
        {/* 4. 底部分页器 */}
        {/* ========================================== */}
        <div className='flex justify-center mt-auto'>
          <Pagination defaultCurrent={1} total={500} showSizeChanger={false} />
        </div>
      </div>

      {/* 底部版权信息 */}
      <Copiright />
      </div>
    </PageContainer>
  )
}

export default PointsRecordPage
