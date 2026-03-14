import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../components/layout/AppSidebar';
import { AppHeader } from '../components/layout/AppHeader';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  return (
    <Layout className="h-screen w-full overflow-hidden">
      {/* 左侧边栏：宽度 240px，背景设为白色 */}
      <Sider width={210} theme="light" className="border-r border-gray-200">
        <AppSidebar />
      </Sider>

      {/* 🚀 2. 新增：预留的二级侧边栏插槽（Portal 终点） */}
      {/* 核心技巧：empty:hidden 保证了如果当前页面没有二级侧边栏，这个 div 就完全消失，不占空间 */}
      <div 
        id="secondary-sidebar-portal" 
        className="empty:hidden h-full shrink-0 bg-white border-r border-gray-200 z-10 transition-all"
      />

      {/* 右侧主体区域 */}
      <Layout>
        {/* 顶部导航栏：去掉默认 padding，高度保持和 Sidebar Logo 一致 */}
        <Header className="bg-white p-0! h-16 leading-16">
          <AppHeader />
        </Header>

        {/* 核心内容渲染区：不滚动，让页面内容决定是否需要滚动 */}
        <Content className="bg-[#f9fafb] overflow-hidden">
          {/* <Outlet /> 负责把 /chat 或 /history 的组件塞到这里 */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}