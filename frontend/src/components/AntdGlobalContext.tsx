// src/components/AntdGlobalContext.tsx
import { App } from 'antd';
import { useEffect } from 'react';
import { setGlobalAntd } from '@/utils/globalAntd'; // 引入刚才的注入函数

export const AntdGlobalContext: React.FC = () => {
  // 🚀 在 React 组件内部，合法地使用 Hook 拿到完美的实例
  const { message, modal, notification } = App.useApp();

  // 把它们存入全局 ts 变量中
  useEffect(() => {
    setGlobalAntd(message, modal, notification);
  }, [message, modal, notification]);

  // 这个组件是隐形的，不需要渲染任何真实 DOM
  return null; 
};