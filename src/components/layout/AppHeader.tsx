import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Dropdown, Popover, Modal, Drawer } from 'antd';
import {
  UserOutlined,
  BellOutlined,
  GlobalOutlined,
  CrownFilled,
  IdcardOutlined,
  HistoryOutlined,
  ProfileOutlined,
  AppstoreOutlined,
  PayCircleOutlined,
  LogoutOutlined,
  CloseOutlined,
  AlipayCircleOutlined,
  WechatOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

// 1. 定义菜单项的 TypeScript 类型
interface UserMenuItem {
  key: string;
  icon: React.ElementType; // 接收 Ant Design 的图标组件
  label: string;
  path?: string; // 可选的路由路径
}

export const AppHeader: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate()

  // 控制充值弹窗的开关状态
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  // 控制当前选中的充值套餐，默认选中第一个 (500积分)
  const [selectedPackage, setSelectedPackage] = useState<number>(500);
  
  // 控制消息中心抽屉的开关状态
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // 充值套餐数据配置
  const rechargePackages = [
    { points: 500, price: '50.00' },
    { points: 750, price: '75.00' },
    { points: 1500, price: '150.00' },
    { points: 2500, price: '220.00' },
    { points: 4500, price: '400.00' },
    { points: 9500, price: '900.00' },
  ];

  // 悬浮窗用户菜单配置
  const userMenuItems: UserMenuItem[] = [
    { key: 'account', icon: IdcardOutlined, label: '账号信息', path: '/account' },
    { key: 'history', icon: HistoryOutlined, label: '历史记录', path: '/history' },
    { key: 'orders', icon: ProfileOutlined, label: '订单管理', path: '/orders' },
    { key: 'vip', icon: AppstoreOutlined, label: '会员方案', path: '/vip' },
    { key: 'points', icon: PayCircleOutlined, label: '积分记录', path: '/points' },
    { key: 'logout', icon: LogoutOutlined, label: '退出登录' }, // 退出登录不需要 path，走独立逻辑
  ];

// 3. 统一的菜单点击处理逻辑
  const handleMenuClick = (item: UserMenuItem) => {
    // 特殊逻辑：退出登录
    if (item.key === 'logout') {
      Modal.confirm({
        title: '确认退出',
        content: '您确定要退出当前账号吗？',
        okText: '退出',
        cancelText: '取消',
        onOk: () => {
          console.log('执行清除 Token 等登出逻辑...');
          // localStorage.removeItem('token');
          navigate('/login'); // 跳转到登录页
        }
      });
      return; // 结束函数，不往下走
    }

    // 常规逻辑：正常的页面跳转
    if (item.path) {
      navigate(item.path);
    }
  };

  // 模拟消息通知数据
  const mockNotifications = Array(5).fill({
    id: 1,
    title: '功能升级预告',
    content: '为保证用户体验，我们将于近期上线合规审查功能，请您敬请期待，以获得更好的...',
    time: '2026-06-26 10:20:30',
    isRead: false,
  }).map((item, index) => ({ ...item, id: index }));

  const languageItems = [
    { key: 'zh', label: '中文' },
    { key: 'en', label: 'English' },
  ];

  // (悬浮窗内容保持你的原样不变)
  const userProfileContent = (
    <div className='w-87 bg-[#757575] rounded-lg p-4 shadow-lg'>
      {/* ... 你原来的 userProfileContent 代码 ... */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <Avatar size={46} icon={<UserOutlined />} className='bg-white text-[#5c6bc0]' />
          <div className='text-white'>
            <div className='text-base font-medium'>上山打老虎</div>
            <div className='text-sm text-gray-200 mt-0.5 tracking-wide'>1803****66</div>
          </div>
        </div>
        <div className='flex items-center gap-1 text-[13px] border border-[#dcb36d] text-[#dcb36d] px-2 py-0.5 rounded'>
          <CrownFilled className='text-xs' /> 黄金会员
        </div>
      </div>

      <div className='flex items-center justify-between mt-5 mb-4'>
        <div className='text-white'>
          <div className='font-medium text-[15px]'>会员特权</div>
          <div className='text-[13px] text-gray-200 mt-1'>开通会员即刻解锁多种专享权益</div>
        </div>
        <button className='bg-[#d7d7d7] text-[#4a3512] font-medium text-sm rounded-[5px] px-4 py-1 hover:bg-linear-to-r hover:from-[#fbe89e] hover:from-10% hover:via-[#f9d98a] hover:via-50% hover:to-[#f7ca76] hover:to-90% hover:shadow-md'>
          开通会员
        </button>
      </div>

      <div className='bg-white rounded-lg p-2.5 grid grid-cols-2 gap-y-1 gap-x-2'>
        {userMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.key} 
              className='flex items-center justify-start gap-3 hover:bg-[#f5f5f5] py-2 px-4 rounded-md cursor-pointer group'
              onClick={() => handleMenuClick(item)} // 这里预留了点击事件，后续可以根据 key 做路由跳转
            >
              <Icon className='text-gray-400 text-base group-hover:text-blue-500 transition-colors' />
              <span className='text-sm text-gray-600 group-hover:text-blue-500 transition-colors'>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div className='flex items-center justify-end h-full px-6 bg-white border-b border-gray-100 gap-6'>
        {/* 点击此区域触发 Modal 打开 */}
        <div 
          className='flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-blue-100 transition-colors'
          onClick={() => setIsRechargeModalOpen(true)}
        >
          <span className='text-[#5c6bc0] font-semibold'>
            🔥 {t('header.quota', '剩余额度')}: 1200
          </span>
        </div>

        {/* 点击铃铛图标触发 Drawer 打开 */}
        <Badge count={7} size='small'>
          <Button 
            type='text' 
            shape='circle' 
            icon={<BellOutlined className='text-lg text-gray-600' />} 
            onClick={() => setIsNotificationOpen(true)}
          />
        </Badge>

        <Dropdown menu={{ items: languageItems, onClick: ({ key }) => i18n.changeLanguage(key) }} placement='bottomRight'>
          <Button type='text' shape='circle' icon={<GlobalOutlined className='text-lg text-gray-600' />} />
        </Dropdown>

        <Popover
          content={userProfileContent}
          trigger='hover'
          placement='bottomRight'
          arrow={false}
          color='transparent'
          styles={{ container: { padding: 0 } }}
        >
          <Avatar size='default' icon={<UserOutlined />} className='bg-[#5c6bc0] cursor-pointer hover:opacity-80 transition-opacity' />
        </Popover>
      </div>

      {/* ==================== 消息中心抽屉 (Drawer) ==================== */}
      <Drawer
        title={
          <div className="flex items-center gap-2 text-base">
            <BellOutlined /> 消息中心
          </div>
        }
        closable={false}
        placement="right"
        size={380} // 与原图比例相近的宽度
        onClose={() => setIsNotificationOpen(false)}
        open={isNotificationOpen}
        extra={
          <span className="text-blue-500 text-sm cursor-pointer hover:text-blue-600">
            全部标记已读
          </span>
        }
        styles={{
          body: { backgroundColor: '#f9fafb', padding: '16px' }, // 给背景加一点灰，让白色的卡片凸显出来
          header: { borderBottom: '1px solid #f0f0f0' }
        }}
      >
        <div className="flex flex-col gap-3">
          {mockNotifications.map((notice) => (
            <div 
              key={notice.id} 
              className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* 卡片头部：红点 + 标题 */}
              <div className="flex items-center gap-2 mb-2">
                {!notice.isRead && <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>}
                <span className="font-medium text-gray-800 text-[15px]">{notice.title}</span>
              </div>
              
              {/* 卡片内容：两行截断 */}
              <p className="text-gray-500 text-[13px] leading-relaxed line-clamp-2 mb-3">
                {notice.content}
              </p>
              
              {/* 卡片底部：时间 + 查看详情 */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 text-xs">
                <div className="text-gray-400 flex items-center gap-1">
                  <ClockCircleOutlined />
                  {notice.time}
                </div>
                <span className="text-gray-500 cursor-pointer hover:text-blue-500 transition-colors">
                  查看详情
                </span>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* ==================== 充值弹窗 (Modal) ==================== */}
      <Modal
        open={isRechargeModalOpen}
        onCancel={() => setIsRechargeModalOpen(false)}
        footer={null}
        closeIcon={null}
        width={720}
        centered
        styles={{
          container: { padding: 0, overflow: 'hidden', borderRadius: '12px' },
        }}
      >
        {/* 1. 弹窗深色头部 */}
        <div className="bg-[#5a5f6b] text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Avatar size={32} icon={<UserOutlined />} className="bg-white text-gray-500" />
            <span className="text-base font-medium">宋工</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">🔥 我的积分 1200</span>
            <CloseOutlined 
              className="cursor-pointer text-lg text-gray-300 hover:text-white transition-colors" 
              onClick={() => setIsRechargeModalOpen(false)} 
            />
          </div>
        </div>

        {/* 2. 弹窗白色主体区 */}
        <div className="bg-white p-6 flex gap-8">
          {/* 左侧：选择积分网格 */}
          <div className="flex-1">
            <h3 className="text-base font-medium text-gray-800 mb-4">选择积分</h3>
            <div className="grid grid-cols-3 gap-3">
              {rechargePackages.map((pkg) => {
                const isSelected = selectedPackage === pkg.points;
                return (
                  <div
                    key={pkg.points}
                    onClick={() => setSelectedPackage(pkg.points)}
                    className={`
                      flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer border transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50/50 text-blue-500' 
                        : 'border-gray-200 hover:border-blue-300 text-gray-800'
                      }
                    `}
                  >
                    <div className="font-semibold text-base mb-1">{pkg.points}积分</div>
                    <div className={isSelected ? 'text-blue-400' : 'text-gray-400'}>
                      ¥ {pkg.price}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 左下方提示文字 */}
            <div className="mt-8 text-xs text-gray-400">
              温馨提示：积分不可兑换会员，不可转赠和提现。充值后不支持退款，有效期为2年。
            </div>
          </div>

          {/* 右侧：扫码支付区域 */}
          <div className="w-55 pl-8 border-l border-gray-100 flex flex-col">
            <h3 className="text-base font-medium text-gray-800 mb-4">扫码支付</h3>
            <div className="w-full aspect-square bg-gray-50 border border-gray-100 rounded-lg flex flex-col items-center justify-center relative overflow-hidden mb-3">
              <div className="w-4/5 h-4/5 border-4 border-black border-dashed opacity-20"></div>
              <div className="absolute left-4 right-4 h-0.5 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-scan-line"></div>
            </div>
            
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 mb-2">
              请使用扫码完成支付
              <AlipayCircleOutlined className="text-blue-500! text-sm" />
              <WechatOutlined className="text-green-500! text-sm" />
            </div>
            
            <div className="text-[11px] text-gray-400 text-center">
              支付即代表您已同意 <a className="text-blue-500 hover:underline">《付费服务协议》</a>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};