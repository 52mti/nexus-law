import React from 'react';
import { AlipayCircleFilled, WechatFilled } from '@ant-design/icons';
// 如果有真实的二维码组件（如 qrcode.react），可以在这里替换 img

interface QRCodeScannerProps {
  qrCodeUrl?: string; // 真实的二维码图片地址或内容
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ qrCodeUrl }) => {
  return (
    <div className="flex flex-col items-center">
      {/* 1. 二维码容器 (带有扫描线动画) */}
      <div className="relative w-50 h-50 border border-gray-100 rounded-xl p-2 mb-4 shadow-sm overflow-hidden bg-white">
        {/* 二维码图片 (这里用占位图代替) */}
        <img 
          src={qrCodeUrl || "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Example"} 
          alt="QR Code" 
          className="w-full h-full object-contain"
        />
        
        {/* 🚀 黑科技：高亮扫描线 */}
        <div className="absolute left-0 right-0 h-0.5 bg-[#666cff] shadow-[0_0_12px_3px_rgba(102,108,255,0.4)] animate-scan-line" />
      </div>

      {/* 2. 底部提示文字与图标 */}
      <div className="flex items-center gap-2 text-[13px] text-gray-500">
        <span>请支付宝扫码完成支付</span>
        {/* 支付宝与微信图标 (原型图中有这两个icon) */}
        <div className="flex items-center gap-1.5 ml-1">
          <AlipayCircleFilled className="text-blue-500! text-[18px] cursor-pointer" />
          <WechatFilled className="text-green-500! text-[18px] cursor-pointer" />
        </div>
      </div>
    </div>
  );
};