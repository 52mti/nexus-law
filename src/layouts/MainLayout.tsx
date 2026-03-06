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

      {/* 右侧主体区域 */}
      <Layout>
        {/* 顶部导航栏：去掉默认 padding，高度保持和 Sidebar Logo 一致 */}
        <Header className="bg-white p-0! h-16 leading-16">
          <AppHeader />
        </Header>

        {/* 核心内容渲染区：加上背景色和内边距，内容超出会自动滚动 */}
        <Content className="bg-[#f9fafb] overflow-auto">
          {/* <Outlet /> 负责把 /chat 或 /history 的组件塞到这里 */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}