// 引入刚刚写的传送门组件
import { PortalSidebar } from '../components/layout/PortalSidebar';

export default function HistoryPage() {
  return (
    <>
      {/* 🚀 这里的侧边栏 UI 会自动“飞”出 Content 区域，挤压 AppHeader */}
      <PortalSidebar>
        <div className="w-60 h-full p-4 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4">历史记录</h2>
          <div className="flex-1 overflow-auto text-sm text-gray-600 space-y-2">
            <div className="p-2 hover:bg-gray-100 rounded cursor-pointer">买到假货怎么维权？</div>
            <div className="p-2 hover:bg-gray-100 rounded cursor-pointer">劳动合同违约金问题</div>
          </div>
        </div>
      </PortalSidebar>

      {/* 👇 正常的页面主体内容，依然正常渲染在 Outlet 预留的灰色区域内 */}
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">历史记录详情</h1>
        <p>请点击左侧的历史记录查看详细对话...</p>
      </div>
    </>
  );
}