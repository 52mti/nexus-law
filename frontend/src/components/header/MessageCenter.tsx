import React, { useState } from 'react'
import { Drawer, Modal, Button } from 'antd'
import { BellOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { getMessageNotification } from '@/api/common'

interface Props {
  open: boolean
  onClose: () => void
}

export const MessageCenter: React.FC<Props> = ({ open, onClose }) => {
  const [isMessageDetailOpen, setIsMessageDetailOpen] = useState(false)
  const [currentMessage, setCurrentMessage] = useState<any>(null)

  const mockNotifications = Array(5)
    .fill({
      id: 1,
      title: '合规审查功能将迎来效果更新，敬请关注',
      content: '为保证用户体验，我们将于近期上线合规审查功能...',
      detailPara1: '我们将在6月中旬上线图片3.0模型效果优化实验...',
      detailPara2: '这次更新是我们持续提升模型能力的重要一步...',
      time: '2026-06-26 10:20:30',
      isRead: false,
    })
    .map((item, index) => ({ ...item, id: index }))

  const handleViewMessageDetail = (notice: any) => {
    setCurrentMessage(notice)
    setIsMessageDetailOpen(true)
  }

  return (
    <>
      <Drawer
        title={
          <div className='flex items-center gap-2 text-base'>
            <BellOutlined /> 消息中心
          </div>
        }
        closable={false}
        placement='right'
        size={380}
        onClose={onClose}
        open={open}
        extra={
          <span className='text-blue-500 text-sm cursor-pointer hover:text-blue-600'>
            全部标记已读
          </span>
        }
        styles={{
          body: { backgroundColor: '#f9fafb', padding: '16px' },
          header: { borderBottom: '1px solid #f0f0f0' },
        }}
      >
        <div className='flex flex-col gap-3'>
          {mockNotifications.map((notice) => (
            <div
              key={notice.id}
              className='bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow'
            >
              <div className='flex items-center gap-2 mb-2'>
                {!notice.isRead && (
                  <div className='w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0'></div>
                )}
                <span className='font-medium text-gray-800 text-[15px] truncate'>
                  {notice.title}
                </span>
              </div>
              <p className='text-gray-500 text-[13px] leading-relaxed line-clamp-2 mb-3'>
                {notice.content}
              </p>
              <div className='flex items-center justify-between mt-2 pt-2 border-t border-gray-50 text-xs'>
                <div className='text-gray-400 flex items-center gap-1'>
                  <ClockCircleOutlined /> {notice.time}
                </div>
                <span
                  className='text-gray-500 cursor-pointer hover:text-primary transition-colors'
                  onClick={() => handleViewMessageDetail(notice)}
                >
                  查看详情
                </span>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      <Modal
        title={
          <span className='font-bold text-gray-800 text-base'>系统消息</span>
        }
        open={isMessageDetailOpen}
        onCancel={() => setIsMessageDetailOpen(false)}
        footer={null}
        centered
        width={480}
        classNames={{ container: 'rounded-2xl' }}
      >
        {currentMessage && (
          <div className='pt-4 pb-2 animate-fade-in'>
            <h3 className='text-[16px] font-bold text-gray-800 mb-3 leading-snug'>
              {currentMessage.title}
            </h3>
            <div className='flex items-center gap-1.5 text-gray-400 text-[13px] mb-6'>
              <ClockCircleOutlined />
              <span>{currentMessage.time}</span>
            </div>
            <div className='text-[14px] text-gray-500 leading-relaxed space-y-6 mb-10 tracking-wide'>
              <p>{currentMessage.detailPara1}</p>
              <p>{currentMessage.detailPara2}</p>
            </div>
            <div className='flex justify-end'>
              <Button
                type='primary'
                onClick={() => setIsMessageDetailOpen(false)}
                className='bg-primary hover:bg-secondary border-none rounded-lg px-6 h-9 text-sm tracking-widest shadow-md shadow-indigo-500/20'
              >
                我知道了
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
