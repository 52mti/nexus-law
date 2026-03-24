import React from 'react';
import { Modal } from 'antd';
import { QRCodeScanner } from '@/components/QRCodeScanner';

interface PaymentModalProps {
  open: boolean;
  onCancel: () => void;
  amount: number | string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ open, onCancel, amount }) => {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null} // 去除底部默认按钮
      title={null}  // 去除左上角默认标题
      centered      // 垂直居中
      width={400}
      classNames={{ container: 'rounded-2xl p-0' }} // 使用 Tailwind 控制圆角
    >
      <div className="pt-10 pb-6 px-6 flex flex-col items-center animate-fade-in">
        
        {/* 弹窗标题 */}
        <div className="text-xl font-bold text-gray-800 mb-8">
          扫码支付 <span className="text-primary mx-1">{amount}</span> 元
        </div>

        {/* 🚀 引入复用的二维码组件 */}
        <QRCodeScanner />

        {/* 底部服务协议 */}
        <div className="text-[12px] text-gray-400 mt-8">
          支付即代表您已同意 <a className="text-primary hover:text-secondary transition-colors cursor-pointer">《付费服务协议》</a>
        </div>
      </div>
    </Modal>
  );
};