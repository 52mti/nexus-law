import React, { useState } from 'react';
import { Input } from 'antd';
import { 
  SearchOutlined, 
  FileTextOutlined, 
  ClockCircleOutlined, 
  DeleteOutlined 
} from '@ant-design/icons';
import { PageContainer } from '@/components/layout/PageContainer';

// ==========================================
// 1. 模拟数据 (按日期分组)
// ==========================================
const mockHistoryData = [
  {
    date: '06-25',
    items: [
      { id: '1', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘——商业分析文章大简要介绍拼多多及其发展历程，引出文章主题，即拼多多崛起的深度复盘...', time: '06-25 2:00' },
      { id: '2', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘——商业分析文章大简要介绍拼多多及其发展历程，引出文章主题，即拼多多崛起的深度复盘...', time: '06-25 2:00' },
      { id: '3', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘——商业分析文章大简要介绍拼多多及其发展历程，引出文章主题，即拼多多崛起的深度复盘...', time: '06-25 2:00' },
      { id: '4', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘——商业分析文章大简要介绍拼多多及其发展历程，引出文章主题，即拼多多崛起的深度复盘...', time: '06-25 2:00' },
      { id: '5', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘——商业分析文章大简要介绍拼多多及其发展历程，引出文章主题，即拼多多崛起的深度复盘...', time: '06-25 2:00' },
      { id: '6', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘——商业分析文章大简要介绍拼多多及其发展历程，引出文章主题，即拼多多崛起的深度复盘...', time: '06-25 2:00' },
    ]
  },
  {
    date: '06-22',
    items: [
      { id: '7', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘——商业分析文章大简要介绍拼多多及其发展历程，引出文章主题，即拼多多崛起的深度复盘...', time: '06-22 2:00' },
      { id: '8', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘——商业分析文章大简要介绍拼多多及其发展历程，引出文章主题，即拼多多崛起的深度复盘...', time: '06-22 2:00' },
      { id: '9', title: '民事合同-个人借款', desc: '朋友接我100块钱,帮我出个借条', detail: '拼多多崛起的深度复盘——商业分析文章大简要介绍拼多多及其发展历程，引出文章主题，即拼多多崛起的深度复盘...', time: '06-22 2:00' },
    ]
  }
];

// 顶部分类 Tabs
const TABS = [
  { key: 'doc', label: '文书记录' },
  { key: 'consult', label: '咨询记录' },
  { key: 'review', label: '合规审查' },
];

export const HistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('consult');

  return (
    <PageContainer>
      <div className="h-full flex flex-col">
      
      {/* ========================================== */}
      {/* 1. 顶部：导航与搜索区 */}
      {/* ========================================== */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        {/* 左侧：胶囊状 Tabs (还原原型图的圆角按钮) */}
        <div className="flex items-center gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <div
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2 rounded-full text-[14px] cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-[#666cff] text-white font-medium shadow-md shadow-indigo-500/20' 
                    : 'text-gray-600 hover:bg-gray-200/50'
                }`}
              >
                {tab.label}
              </div>
            );
          })}
        </div>

        {/* 右侧：搜索框 */}
        <Input 
          prefix={<SearchOutlined className="text-gray-400 mr-1" />} 
          placeholder="搜索历史记录" 
          className="w-72 h-10 rounded-lg bg-white border-transparent hover:border-transparent focus:border-[#666cff] focus:shadow-sm"
        />
      </div>

      {/* ========================================== */}
      {/* 2. 主体：时间轴 + 卡片网格 */}
      {/* ========================================== */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        <div className="flex flex-col">
          {mockHistoryData.map((group, groupIndex) => (
            <div key={group.date} className="flex relative pb-10">
              
              {/* 🚀 核心黑科技：手绘时间轴竖线 */}
              {/* 如果不是最后一项，就画一条绝对定位的灰色竖线贯穿到底 */}
              {groupIndex !== mockHistoryData.length - 1 && (
                <div className="absolute left-[70px] top-4 bottom-0 w-px bg-gray-200 z-0" />
              )}

              {/* 左侧：日期与时间轴圆点 */}
              <div className="w-24 shrink-0 flex items-start justify-between relative z-10 pt-1 pr-5">
                <span className="text-gray-500 text-[15px]">{group.date}</span>
                {/* 蓝色的圆点，加上底色相同的环(ring)来实现镂空效果 */}
                <div className="w-[7px] h-[7px] rounded-full bg-[#666cff] mt-[7px] ring-[5px] ring-[#f9fafb]" />
              </div>

              {/* 右侧：卡片网格 (支持响应式：大屏3列，中屏2列) */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {group.items.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col group cursor-pointer"
                  >
                    {/* 卡片头部：图标 + 标题 */}
                    <div className="flex items-center gap-2 mb-3">
                      <FileTextOutlined className="text-[#666cff] text-lg" />
                      <span className="font-bold text-gray-800">{item.title}</span>
                    </div>

                    {/* 卡片主体：描述内容 */}
                    <div className="flex-1 mb-6">
                      <div className="text-[13px] text-gray-800 mb-2">
                        <span className="font-bold">内容描述：</span>
                        {item.desc}
                      </div>
                      {/* 使用 line-clamp-3 限制最多显示三行，多余显示... */}
                      <div className="text-[13px] text-gray-500 leading-relaxed line-clamp-3">
                        {item.detail}
                      </div>
                    </div>

                    {/* 卡片底部：时间 + 删除按钮 */}
                    <div className="flex items-center justify-between text-gray-400 mt-auto pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <ClockCircleOutlined /> {item.time}
                      </div>
                      {/* 垃圾桶图标：默认灰色，悬浮变红 */}
                      <DeleteOutlined 
                        className="text-gray-300 hover:text-red-500 transition-colors text-base" 
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止卡片点击事件
                          console.log('删除记录', item.id);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>
          </ div>
    </PageContainer>
  );
};

export default HistoryPage;