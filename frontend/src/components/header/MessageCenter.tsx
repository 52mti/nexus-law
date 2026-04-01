import React, { useState, useEffect } from "react";
import { Drawer, Modal, Button, App, Spin, Empty } from "antd";
import { BellOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { getMessageNotification, markReaded } from "@/api/common";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const MessageCenter: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();

  // ==========================================
  // 🚀 状态管理
  // ==========================================
  const [isMessageDetailOpen, setIsMessageDetailOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<any>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // 🚀 请求消息列表
  // ==========================================
  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        // 请求参数：默认拿最新 20 条消息，后续可根据需求接入底部分页
        const res = await getMessageNotification({ current: 1, size: 20 });

        if (res?.successful && res?.data?.records) {
          const formattedData = res.data.records.map((item: any) => {
            // 处理时间格式，例如 "2026-03-30T15:49:46.450Z" -> "2026-03-30 15:49:46"
            let formattedTime = item.createTime || "-";
            if (formattedTime.includes("T")) {
              formattedTime = formattedTime.replace("T", " ").substring(0, 19);
            }

            return {
              id: item.id,
              title: item.title || t("1rPK7Kh2jWTApuNa8oLbv"),
              content: item.content || "",
              time: formattedTime,
              // 后端返回的 read: "1" 是已读，"0" 是未读
              isRead: String(item.read) === "1",
              raw: item, // 保留原始数据
            };
          });
          setNotifications(formattedData);
        } else {
          setNotifications([]);
        }
      } catch (error) {
        console.error("获取消息列表异常:", error);
        message.error(t("4kt3c0bN7e7oESrKpHlnj"));
      } finally {
        setLoading(false);
      }
    };

    // 只有当抽屉打开时，才去请求数据
    if (open) {
      fetchNotifications();
    }
  }, [open, message]);

  // ==========================================
  // 🚀 交互操作
  // ==========================================
  const handleViewMessageDetail = async (notice: any) => {
    // 1. 先打开弹窗并展示详情
    setCurrentMessage(notice);
    setIsMessageDetailOpen(true);

    // 2. 如果消息未读，则调用标记已读接口
    if (!notice.isRead) {
      try {
        const res = await markReaded(notice.id);

        // 假设接口返回 successful 为 true，或者直接认为没报错就成功
        if (res?.successful || res?.code === 0 || res?.code === 200) {
          // 3. 乐观更新本地状态，消除对应列表项的未读红点
          setNotifications((prev) =>
            prev.map((item) =>
              item.id === notice.id ? { ...item, isRead: true } : item,
            ),
          );
        }
      } catch (error) {
        console.error("标记已读状态失败:", error);
        // message.error('网络异常，无法标记为已读') // 这里静默失败即可，没必要打断用户看消息
      }
    }
  };

  const handleMarkAllAsRead = () => {
    // 💡 提示：如果后端有提供“全部已读”的接口，在此处对接
    message.success(t("XPA9ue7_wp_bPGWxZTLSs"));
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
  };

  return (
    <>
      <Drawer
        title={
          <div className="flex items-center gap-2 text-base">
            <BellOutlined /> {t("6qjXDiWASM4QFoKYxn9xO")}
          </div>
        }
        closable={false}
        placement="right"
        size={380}
        onClose={onClose}
        open={open}
        extra={
          <span
            className="text-blue-500 text-sm cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleMarkAllAsRead}
          >
            {t("zMChAdzPN0L2xvlCMxP2F")}
          </span>
        }
        styles={{
          body: { backgroundColor: "#f9fafb", padding: "16px" },
          header: { borderBottom: "1px solid #f0f0f0" },
        }}
      >
        <div className="flex flex-col gap-3 relative min-h-[100px]">
          {/* 🚀 加载状态 */}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f9fafb]/80 backdrop-blur-[1px]">
              <Spin description={t("bfJ8KlxbV0DiFDkTPbmfD")} />
            </div>
          )}

          {/* 🚀 列表数据 / 空状态 */}
          {!loading && notifications.length === 0 ? (
            <div className="pt-20">
              <Empty description={t("GPIfvzlliJuVHtKcovAno")} />
            </div>
          ) : (
            notifications.map((notice) => (
              <div
                key={notice.id}
                className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  {!notice.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
                  )}
                  <span className="font-medium text-gray-800 text-[15px] truncate">
                    {notice.title}
                  </span>
                </div>
                <p className="text-gray-500 text-[13px] leading-relaxed line-clamp-2 mb-3">
                  {notice.content}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 text-xs">
                  <div className="text-gray-400 flex items-center gap-1">
                    <ClockCircleOutlined /> {notice.time}
                  </div>
                  <span
                    className="text-gray-500 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleViewMessageDetail(notice)}
                  >
                    {t("uT_w5mZsxlBhmSBdYeM3h")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Drawer>

      <Modal
        title={
          <span className="font-bold text-gray-800 text-base">
            {t("KbBI_RUAQ2pR3-6eer8Yb")}
          </span>
        }
        open={isMessageDetailOpen}
        onCancel={() => setIsMessageDetailOpen(false)}
        footer={null}
        centered
        width={480}
        classNames={{ container: "rounded-2xl" }}
      >
        {currentMessage && (
          <div className="pt-4 pb-2 animate-fade-in">
            <h3 className="text-[16px] font-bold text-gray-800 mb-3 leading-snug">
              {currentMessage.title}
            </h3>
            <div className="flex items-center gap-1.5 text-gray-400 text-[13px] mb-6">
              <ClockCircleOutlined />
              <span>{currentMessage.time}</span>
            </div>

            {/* 🚀 修改点：使用 content，并支持文本自动换行 */}
            <div className="text-[14px] text-gray-500 leading-relaxed space-y-6 mb-10 tracking-wide whitespace-pre-wrap">
              {currentMessage.content}
            </div>

            <div className="flex justify-end">
              <Button
                type="primary"
                onClick={() => setIsMessageDetailOpen(false)}
                className="bg-primary hover:bg-secondary border-none rounded-lg px-6 h-9 text-sm tracking-widest shadow-md shadow-indigo-500/20"
              >
                {t("Fw8SefKWcNDVHCFhUFmhk")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
