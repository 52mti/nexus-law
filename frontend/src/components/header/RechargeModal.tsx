import React, { useState, useEffect } from 'react'
import { Modal, Avatar, Spin, App, Button } from 'antd'
import { UserOutlined, CloseOutlined } from '@ant-design/icons'
import { QRCodeScanner } from '../QRCodeScanner' // 确保路径正确
import { pointPlan } from '@/api/common'
import { buyPoints } from '@/api/payment';

interface Props {
  open: boolean
  onClose: () => void
}

// 定义后端返回的套餐类型
interface PointPackage {
  id: string
  name: string
  price: number
  pointsCount: number
}

export const RechargeModal: React.FC<Props> = ({ open, onClose }) => {
  const { message } = App.useApp()

  // 🚀 状态管理
  const [packages, setPackages] = useState<PointPackage[]>([])
  const [loading, setLoading] = useState(false) // 专用于套餐列表初始化的 Loading
  const [orderLoading, setOrderLoading] = useState(false) // 🚀 专用于下单按钮的 Loading
  const [selectedId, setSelectedId] = useState<string>('') // 存放选中的套餐 ID

  // 获取积分套餐并做 sessionStorage 缓存
  useEffect(() => {
    if (!open) return;

    const fetchPackages = async () => {
      const cachedData = sessionStorage.getItem('point_packages_cache');
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          setPackages(parsed);
          if (parsed.length > 0) setSelectedId(parsed[0].id);
          return;
        } catch (e) {
          console.error('缓存解析失败，重新请求', e);
        }
      }

      setLoading(true);
      try {
        const res = await pointPlan({ current: 1, size: 50 });
        if (res.successful && res.data?.records) {
          const sortedRecords = res.data.records.sort((a: any, b: any) => a.price - b.price);

          setPackages(sortedRecords);
          sessionStorage.setItem('point_packages_cache', JSON.stringify(sortedRecords));
          if (sortedRecords.length > 0) setSelectedId(sortedRecords[0].id);
        } else {
          message.error(res.message || '获取积分套餐失败');
        }
      } catch (error) {
        console.error('获取套餐异常:', error);
        message.error('网络异常，无法获取套餐信息');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [open, message]);

  // 🚀 封装下单逻辑
  const handleIssueOrder = async () => {
    // 1. 校验是否已经选中了套餐
    if (!selectedId) {
      message.error('请先选择要充值的积分套餐');
      return;
    }

    try {
      setOrderLoading(true); // 开启按钮专属 Loading

      // 2. 调用统一下单接口，把 selectedId 作为订单关联套餐的 ID 传给后端
      const res = await buyPoints({ id: selectedId });

      // 3. 处理后端返回结果 (假设以 code === 200 为成功基准，请根据实际情况调整)
      if (res.code === 200 || res.successful) {
        message.success('下单成功，请使用手机扫码支付！');

        // 💡 提示：这里通常会拿到一个 payUrl，你可以把它存进 state，
        // 传递给下方的 <QRCodeScanner payUrl={payUrl} /> 组件生成真实二维码
      } else {
        message.error(res.message || '下单失败，请重试');
      }
    } catch (error) {
      console.error('下单报错:', error);
    } finally {
      setOrderLoading(false); // 关闭按钮专属 Loading
    }
  };

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

      <div className='bg-white p-6 flex gap-8 rounded-b-xl min-h-[350px] relative'>
        {/* 套餐列表初始化的加载状态遮罩 */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <Spin tip="正在加载套餐..." />
          </div>
        )}

        <div className='flex-1'>
          <h3 className='text-base font-medium text-gray-800 mb-4'>选择积分</h3>
          <div className='grid grid-cols-3 gap-3'>
            {packages.map((pkg) => {
              const isSelected = selectedId === pkg.id // 🚀 使用 ID 判断选中状态
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedId(pkg.id)} // 🚀 点击时更新选中 ID
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer border transition-all
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50/50 text-blue-500'
                      : 'border-gray-200 hover:border-blue-300 text-gray-800'
                    }
                  `}
                >
                  <div className='font-semibold text-base mb-1'>
                    {pkg.pointsCount} 积分
                  </div>
                  <div
                    className={isSelected ? 'text-blue-400' : 'text-gray-400'}
                  >
                    ¥ {pkg.price.toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>

          {!loading && packages.length === 0 && (
            <div className="text-gray-400 text-center py-8 text-sm">
              暂无可用积分套餐
            </div>
          )}

          <div className='mt-8 text-[12px] text-gray-400 leading-relaxed'>
            温馨提示：积分不可兑换会员，不可转赠和提现。充值后不支持退款，有效期为2年。
          </div>
        </div>

        <div className='w-55 pl-8 border-l border-gray-100 flex flex-col items-center justify-center'>
          <h3 className='text-base font-medium text-gray-800 w-full mb-4'>
            扫码支付
          </h3>
          <QRCodeScanner />

          {/* 🚀 下单按钮，使用专属的 orderLoading 控制状态 */}
          <Button
            type="primary"
            size="large"
            loading={orderLoading}
            onClick={handleIssueOrder}
            className="w-full mb-8 bg-primary mt-8 hover:bg-secondary rounded-lg font-medium tracking-wide shadow-md shadow-indigo-500/20 border-none"
          >
            {orderLoading ? '正在生成支付订单...' : '确认下单'}
          </Button>
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