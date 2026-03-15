import { useState, useLayoutEffect } from 'react';

export function useThemeColor(variableName: string, fallbackColor: string = '#1677ff') {
  const [color, setColor] = useState(fallbackColor);

  useLayoutEffect(() => {
    // 获取根节点 <html> 的所有计算样式
    const rootStyle = getComputedStyle(document.documentElement);
    // 读取我们定义的变量值，并去掉可能包含的空格
    const cssColor = rootStyle.getPropertyValue(variableName).trim();
    
    if (cssColor) {
      setColor(cssColor);
    }
  }, [variableName]);

  return color;
}