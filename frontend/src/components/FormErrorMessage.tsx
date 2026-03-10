import React from 'react';
import { ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

// 导出这个类型，方便其他表单组件引用
export interface ErrorState {
  msg: string;
  type: 'warning' | 'error';
}

interface FormErrorMessageProps {
  errorData: ErrorState | null; // 传入错误数据（包含类型和提示文本）
  shakeKey: number;             // 传入时间戳，用于触发每次报错的抖动动画
}

export const FormErrorMessage: React.FC<FormErrorMessageProps> = ({ errorData, shakeKey }) => {
  return (
    /* 外层固定高度占位，防止表单高度跳动 (CLS) */
    <div className="mt-4 h-12 w-full">
      {errorData && errorData.msg && (
        <div
          key={shakeKey}
          className={`flex h-full w-full items-center gap-2 rounded-md border px-4 text-[14px] animate-shake-y ${
            errorData.type === 'warning'
              ? 'border-[#ffd591] bg-[#fffbe6] text-[#fa8c16]' // 橙色：信息缺失警告
              : 'border-[#ffccc7] bg-[#fff2f0] text-[#ff4d4f]' // 红色：严重错误
          }`}
        >
          {errorData.type === 'warning' ? (
            <ExclamationCircleOutlined className="text-base" />
          ) : (
            <CloseCircleOutlined className="text-base" />
          )}
          <span className="truncate">{errorData.msg}</span>
        </div>
      )}
    </div>
  );
};