import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  /** * 控制页面的最大宽度
   * @default 'max-w-[1200px]' (黄金阅读宽度)
   */
  maxWidth?: 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl' | 'max-w-[1200px]' | 'max-w-[1440px]' | 'none';
  /** 透传额外的 className */
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  maxWidth = 'max-w-[1200px]', // 默认给一个适合订单、列表页的宽度
  className = ''
}) => {
  return (
    // 最外层：始终占满高度，并统一页面的底色和内边距
    <div className={`min-h-full bg-[#f9fafb] p-6 flex flex-col animate-fade-in ${className}`}>
      
      {/* 核心限宽容器：按需限制最大宽度，并自动水平居中 */}
      <div className={`flex-1 flex flex-col w-full mx-auto ${maxWidth === 'none' ? '' : maxWidth}`}>
        {children}
      </div>
      
    </div>
  );
};