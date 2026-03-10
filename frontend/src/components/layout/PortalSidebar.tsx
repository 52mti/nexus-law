import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const PortalSidebar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 优化：不再存布尔值，而是直接把找到的真实 DOM 节点存入 State
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // 只有在浏览器绘制完成后，才能在真实 DOM 中找到这个插槽
    const node = document.getElementById('secondary-sidebar-portal');
    
    if (node) {
      // 告诉 Linter：这是 Portal 必须的二次渲染，请闭嘴 🤫
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPortalNode(node);
    }
  }, []);

  // 如果还没拿到真实的 DOM 节点，先不渲染
  if (!portalNode) return null;

  // 使用 React 的 createPortal 将内容渲染到插槽中
  return createPortal(children, portalNode);
};