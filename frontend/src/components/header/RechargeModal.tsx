import React, { useState } from 'react'
import { Modal, Avatar } from 'antd'
import { UserOutlined, CloseOutlined } from '@ant-design/icons'
import { QRCodeScanner } from '../QRCodeScanner' // 确保路径正确

interface Props {
  open: boolean
  onClose: () => void
}

export const RechargeModal: React.FC<Props> = ({ open, onClose }) => {
  const [selectedPackage, setSelectedPackage] = useState<number>(500)

  const rechargePackages = [
    { points: 500, price: '50.00' },
    { points: 750, price: '75.00' },
    { points: 1500, price: '150.00' },
    { points: 2500, price: '220.00' },
    { points: 4500, price: '400.00' },
    { points: 9500, price: '900.00' },
  ]

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closeIcon={null}
      width={720}
      centered
      rootClassName='[&_.ant-modal]:outline-none [&_.ant-modal-wrap]:outline-none [&_.ant-modal-content]:outline-none'
      styles={{
        container: { padding: 0, overflow: 'hidden', borderRadius: '12px' },
      }}
    >
      <div className='bg-[#5a5f6b] text-white px-6 py-4 flex justify-between items-center rounded-t-xl'>
        <div className='flex items-center gap-3'>
          <Avatar
            size={32}
            icon={<UserOutlined />}
            className='bg-white text-gray-500'
          />
          <span className='text-base font-medium'>宋工</span>
        </div>
        <div className='flex items-center gap-4'>
          <span className='text-sm'>🔥 我的积分 1200</span>
          <CloseOutlined
            className='cursor-pointer text-lg text-gray-300 hover:text-white transition-colors'
            onClick={onClose}
          />
        </div>
      </div>

      <div className='bg-white p-6 flex gap-8 rounded-b-xl'>
        <div className='flex-1'>
          <h3 className='text-base font-medium text-gray-800 mb-4'>选择积分</h3>
          <div className='grid grid-cols-3 gap-3'>
            {rechargePackages.map((pkg) => {
              const isSelected = selectedPackage === pkg.points
              return (
                <div
                  key={pkg.points}
                  onClick={() => setSelectedPackage(pkg.points)}
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer border transition-all
                    ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 text-blue-500'
                        : 'border-gray-200 hover:border-blue-300 text-gray-800'
                    }
                  `}
                >
                  <div className='font-semibold text-base mb-1'>
                    {pkg.points}积分
                  </div>
                  <div
                    className={isSelected ? 'text-blue-400' : 'text-gray-400'}
                  >
                    ¥ {pkg.price}
                  </div>
                </div>
              )
            })}
          </div>
          <div className='mt-8 text-[12px] text-gray-400 leading-relaxed'>
            温馨提示：积分不可兑换会员，不可转赠和提现。充值后不支持退款，有效期为2年。
          </div>
        </div>

        <div className='w-55 pl-8 border-l border-gray-100 flex flex-col items-center justify-center'>
          <h3 className='text-base font-medium text-gray-800 w-full mb-4'>
            扫码支付
          </h3>
          <QRCodeScanner />
          <div className='text-[12px] text-gray-400 text-center mt-3'>
            支付即代表您已同意{' '}
            <a className='text-primary hover:text-secondary hover:underline transition-colors'>
              《付费服务协议》
            </a>
          </div>
        </div>
      </div>
    </Modal>
  )
}
