import React, { useState, useEffect } from 'react';
import { Button, Input, message, Typography, Pagination, Spin, Empty } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/store/useUserStore';
import { getRebatePageList, type RebateRecord } from '@/api/rebate';

const { Title, Text } = Typography;

export const ShareRebatePage: React.FC = () => {
  const { t } = useTranslation();

  // 直接从全局状态获取用户信息
  const userInfo = useUserStore((state) => state.memberInfo);

  // 列表分页状态
  const [records, setRecords] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchList = async () => {
      setLoadingList(true);
      try {
        const res = await getRebatePageList({ current, size: pageSize });
        if (res && res.successful && res.data) {
          const rawRecords = res.data.records || [];
          // 预处理映射未知字段，给出合理的默认回退
          const formattedRecords = rawRecords.map((item: RebateRecord, index: number) => ({
            id: item.id || String(index),
            // 可能的动作字段名
            type: item.actionName || item.actionType || item.title || item.type || t('unknown_action'),
            // 可能的时间字段名
            date: item.createTime || item.time || item.createdAt || '-',
            // 可能的返利金额字段名
            rebate: item.rebateAmount !== undefined ? String(item.rebateAmount) : (item.rebate !== undefined ? String(item.rebate) : '0'),
            // 可能的可提现金额字段名
            balance: item.withdrawableAmount !== undefined ? String(item.withdrawableAmount) : (item.balance !== undefined ? String(item.balance) : '0'),
            raw: item,
          }));
          setRecords(formattedRecords);
          setTotal(res.data.total || 0);
        }
      } catch (error) {
        console.error('获取返利列表报错:', error);
      } finally {
        setLoadingList(false);
      }
    };

    fetchList();
  }, [current, pageSize]);

  const handlePageChange = (page: number, size: number) => {
    setCurrent(page);
    setPageSize(size);
  };

  const exclusiveLink = userInfo?.exclusiveLink || t('loading_text');

  const handleCopy = () => {
    if (!userInfo?.exclusiveLink) {
      message.warning(t('getting_link_wait'));
      return;
    }
    navigator.clipboard.writeText(exclusiveLink);
    message.success(t('link_copied'));
  };


  return (
    <div className="p-6 bg-[#f9fafb] min-h-full">
      {/* 头部标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ShareAltOutlined className="text-[#666cff] text-xl" />
          <Title level={4} style={{ margin: 0, color: '#1a1a1a' }}>
            {t('share_rebate')}
          </Title>
          <Text type="secondary" className="text-xs ml-2">
            {t('share_rebate_desc')}
          </Text>
        </div>
      </div>

      {/* 专属链接区域 */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <Text className="text-gray-700 font-medium whitespace-nowrap">{t('exclusive_link')}</Text>
          <Input
            value={exclusiveLink}
            readOnly
            className="bg-[#f9fafb] border-gray-200 h-10 rounded-md"
            style={{ maxWidth: '500px' }}
          />
          <Button
            type="primary"
            onClick={handleCopy}
            className="bg-[#1890ff] hover:bg-[#40a9ff] border-none h-10 px-6 rounded-md"
          >
            {t('copy')}
          </Button>
        </div>
      </div>

      {/* 返利列表区域 */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 relative min-h-[400px] flex flex-col">
        {loadingList && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg">
            <Spin size="large" />
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <Title level={5} style={{ margin: 0, color: '#1a1a1a' }}>
            {t('rebate_list')}
          </Title>
          <Button
            type="primary"
            className="bg-[#1890ff] hover:bg-[#40a9ff] border-none h-10 px-6 rounded-md"
          >
            {t('withdraw')}
          </Button>
        </div>

        {/* 列表头部 */}
        <div className="flex text-sm text-gray-500 mb-2 px-4">
          <div className="flex-1"></div>
          <div className="w-24 text-right">{t('rebate_amount')}</div>
          <div className="w-32 text-right">{t('withdrawable_amount')}</div>
        </div>

        {/* 列表项 */}
        <div className="space-y-3 flex-1">
          {records.length === 0 && !loadingList ? (
            <div className="py-10">
              <Empty description={t('no_rebate_records')} />
            </div>
          ) : (
            records.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-[#f9fafb] transition-colors"
              >
                <div className="flex-1">
                  <div className="text-[#1a1a1a] font-medium mb-1">{item.type}</div>
                  <div className="text-gray-400 text-xs">{item.date}</div>
                </div>
                <div className="w-24 text-right">
                  <span className={String(item.rebate).startsWith('+') ? 'text-[#1a1a1a] font-medium' : 'text-[#1a1a1a] font-medium'}>
                    {item.rebate}
                  </span>
                </div>
                <div className="w-32 text-right">
                  <span className="text-[#1a1a1a] font-medium">{item.balance}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 分页器 */}
        {total > 0 && (
          <div className="flex justify-center mt-6 pt-4 border-t border-gray-50">
            <Pagination
              current={current}
              pageSize={pageSize}
              total={total}
              showSizeChanger={true}
              onChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareRebatePage;
