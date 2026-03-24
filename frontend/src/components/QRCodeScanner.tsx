import React from 'react';
// 1. 引入真实的二维码生成组件 (推荐使用 SVG)
import { QRCodeSVG } from 'qrcode.react';
// 2. 移除了 AntD 的支付宝和微信图标，改为引入 Chapa 的 Icon (或你可以用文字代替)
// 这里假设你项目里有 Chapa 的 Logo 图片，如果没有，我下面提供了文字版本的备选方案
import chapaLogo from '@/assets/chapa-logo.png'; 

interface ChapaQRCodeScannerProps {
  /** Chapa 返回的真实的支付页面地址 (checkout_url) */
  checkoutUrl?: string; 
  /** 可选：订单总额，展示在二维码下方增强体验 */
  amount?: number | string;
  /** 可选：货币符号，默认为 ETB */
  currency?: string;
  /** 可选：是否正在加载（等待后端返回 URL） */
  loading?: boolean;
}

export const QRCodeScanner: React.FC<ChapaQRCodeScannerProps> = ({ 
  checkoutUrl, 
  amount, 
  currency = 'ETB',
  loading = false
}) => {
  
  // 3. 定义一个占位链接，用于没有传入真实的 url 时展示原型
  const placeholderUrl = "https://chapa.co";

  return (
    <div className="flex flex-col items-center">
      {/* 1. 二维码容器 (保持了原有的扫描线动画和样式) */}
      <div className="relative w-50 h-50 border border-gray-100 rounded-xl p-3 mb-3 shadow-sm overflow-hidden bg-white flex items-center justify-center">
        
        {loading ? (
          // 4. 新增：加载状态展示
          <div className="text-gray-400 text-xs animate-pulse">正在生成支付二维码...</div>
        ) : (
          // 5. 黑科技：替换 <img> 为真实的二维码生成组件
          <QRCodeSVG 
            value={checkoutUrl || placeholderUrl} // 真实的 URL
            size={176} // 适配 w-50 (200px) 扣除 p-3*2 后的尺寸
            level={"H"} // 高容错率，保证复杂环境下也能扫出
            marginSize={0}
            // 可选：在二维码中间添加 Chapa Logo (需要你有 Logo 图片)
            imageSettings={{
              src: chapaLogo,
              x: undefined,
              y: undefined,
              height: 16 * 1.5,
              width: 45 * 1.5,
              excavate: true, // 镂空二维码，防止 Logo 遮挡数据点
            }}
          />
        )}
        
        {/* 🚀 黑科技：保持高亮扫描线动画 */}
        {!loading && checkoutUrl && (
          <div className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_12px_3px_rgba(102,108,255,0.4)] animate-scan-line" />
        )}
      </div>

      {/* 2. 底部提示文字与图标 (针对 Chapa 和埃塞市场进行了调整) */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        {amount && (
          // 6. 新增：展示支付金额
          <div className="text-[15px] font-bold text-gray-800">
            {amount} <span className="text-xs font-normal text-gray-500">{currency}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-[12px] text-gray-500">
          {/* 7. 修改：替换支付宝文案 */}
          <span>请扫描二维码完成支付</span>
        </div>

        {/* 8. 修改：移除中式图标，替换为提示本地支付方式的文字 (如 telebirr) */}
        <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-1.5 mt-0.5 w-full">
          支持 telebirr, CBE Birr, M-Pesa & Cards
        </div>
      </div>
    </div>
  );
};