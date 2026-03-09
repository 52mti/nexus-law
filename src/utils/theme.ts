export const getThemeColor = (cssVariableName: string): string => {
  // 确保在浏览器环境下执行
  if (typeof window === 'undefined') return '';
  
  // 获取 :root 节点上的 CSS 变量值并去除空格
  return getComputedStyle(document.documentElement)
    .getPropertyValue(cssVariableName)
    .trim();
};