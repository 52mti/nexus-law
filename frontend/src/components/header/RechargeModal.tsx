import React, { useState, useEffect } from "react";
import { Modal, Avatar, Spin, App, Button } from "antd";
import { UserOutlined, CloseOutlined } from "@ant-design/icons";
import { QRCodeScanner } from "../QRCodeScanner"; // 确保路径正确
import { pointPlan } from "@/api/common";
import { buyPoints } from "@/api/payment";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onClose: () => void;
}

// 定义后端返回的套餐类型
interface PointPackage {
  id: string;
  name: string;
  price: number;
  pointsCount: number;
}

export const RechargeModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();

  // 🚀 状态管理
  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [loading, setLoading] = useState(false); // 专用于套餐列表初始化的 Loading
  const [orderLoading, setOrderLoading] = useState(false); // 🚀 专用于下单按钮的 Loading
  const [selectedId, setSelectedId] = useState<string>(""); // 存放选中的套餐 ID

  // 获取积分套餐并做 sessionStorage 缓存
  useEffect(() => {
    if (!open) return;

    const fetchPackages = async () => {
      const cachedData = sessionStorage.getItem("point_packages_cache");
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          setPackages(parsed);
          if (parsed.length > 0) setSelectedId(parsed[0].id);
          return;
        } catch (e) {
          console.error("缓存解析失败，重新请求", e);
        }
      }

      setLoading(true);
      try {
        const res = await pointPlan({ current: 1, size: 50 });
        if (res.successful && res.data?.records) {
          const sortedRecords = res.data.records.sort(
            (a: any, b: any) => a.price - b.price,
          );

          setPackages(sortedRecords);
          sessionStorage.setItem(
            "point_packages_cache",
            JSON.stringify(sortedRecords),
          );
          if (sortedRecords.length > 0) setSelectedId(sortedRecords[0].id);
        } else {
          message.error(res.message || t("BD3-_riCSerxBNW11RpVA"));
        }
      } catch (error) {
        console.error("获取套餐异常:", error);
        message.error(t("94nidbWrt1CrI2gvgGPry"));
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [open, message]);

  // 🚀 封装下单逻辑
  const handleIssueOrder = async () => {
    // 1. 校验是否已经选中了套餐
    if (!selectedId) {
      message.error(t("2aGgX94HuiXLGDH2C91Tj"));
      return;
    }

    try {
      setOrderLoading(true); // 开启按钮专属 Loading

      // 2. 调用统一下单接口，把 selectedId 作为订单关联套餐的 ID 传给后端
      const res = await buyPoints({ id: selectedId });

      // 3. 处理后端返回结果 (假设以 code === 200 为成功基准，请根据实际情况调整)
      if (res.code === 200 || res.successful) {
        message.success(t("bRjUxTnow0Ap-YnPsFFUC"));

        // 💡 提示：这里通常会拿到一个 payUrl，你可以把它存进 state，
        // 传递给下方的 <QRCodeScanner payUrl={payUrl} /> 组件生成真实二维码
      } else {
        message.error(res.message || t("cFcF3RpiSV10fKSQvGa7N"));
      }
    } catch (error) {
      console.error("下单报错:", error);
    } finally {
      setOrderLoading(false); // 关闭按钮专属 Loading
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closeIcon={null}
      width={720}
      centered
      rootClassName="[&_.ant-modal]:outline-none [&_.ant-modal-wrap]:outline-none [&_.ant-modal-content]:outline-none"
      styles={{
        container: { padding: 0, overflow: "hidden", borderRadius: "12px" },
      }}
    >
      <div className="bg-[#5a5f6b] text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
        <div className="flex items-center gap-3">
          <Avatar
            size={32}
            icon={<UserOutlined />}
            className="bg-white text-gray-500"
          />
          <span className="text-base font-medium">
            {t("RMSNWy1Vp2xPdEv-A2nGv")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            🔥 <span>{t("iOvn0ncUeUNA82PEm-AtF")}</span> 1200
          </span>
          <CloseOutlined
            className="cursor-pointer text-lg text-gray-300 hover:text-white transition-colors"
            onClick={onClose}
          />
        </div>
      </div>

      <div className="bg-white p-6 flex gap-8 rounded-b-xl min-h-[350px] relative">
        {/* 套餐列表初始化的加载状态遮罩 */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <Spin description={t("aJZTVvN-a_vEd_SwB7k9a")} />
          </div>
        )}

        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-800 mb-4">
            {t("lgaYVhZRYkOlxE2ZP6Lif")}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {packages.map((pkg) => {
              const isSelected = selectedId === pkg.id; // 🚀 使用 ID 判断选中状态
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedId(pkg.id)} // 🚀 点击时更新选中 ID
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer border transition-all
                    ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 text-blue-500"
                        : "border-gray-200 hover:border-blue-300 text-gray-800"
                    }
                  `}
                >
                  <div className="font-semibold text-base mb-1">
                    {pkg.pointsCount} {t("fiBgQpgbqy2hy1nW1pOwU")}
                  </div>
                  <div
                    className={isSelected ? "text-blue-400" : "text-gray-400"}
                  >
                    {t("AtnGVfDt06LkXbQwoqYoF")} {pkg.price.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && packages.length === 0 && (
            <div className="text-gray-400 text-center py-8 text-sm">
              {t("IirEZOsPwLkvkwH7dKm-G")}
            </div>
          )}

          <div className="mt-8 text-[12px] text-gray-400 leading-relaxed">
            {t("DvODC5PPFv4w1Tw2boY6P")}
          </div>
        </div>

        <div className="w-55 pl-8 border-l border-gray-100 flex flex-col items-center justify-center">
          <h3 className="text-base font-medium text-gray-800 w-full mb-4">
            {t("bilZpkT35pe7rc_kPqYzh")}
          </h3>
          <QRCodeScanner />

          {/* 🚀 下单按钮，使用专属的 orderLoading 控制状态 */}
          <Button
            type="primary"
            size="large"
            loading={orderLoading}
            onClick={handleIssueOrder}
            className="w-full mb-8 bg-primary mt-8 hover:bg-secondary rounded-lg font-medium tracking-wide shadow-md shadow-indigo-500/20 border-none"
          >
            {orderLoading
              ? t("dQc64SStuPf1ewP82hciO")
              : t("iUK1H65U-CevUxcpNqAL9")}
          </Button>
          <div className="text-[12px] text-gray-400 text-center mt-3">
            {t("pXNQr6vug-33Su5C0L3ag")}
            <a className="text-primary hover:text-secondary hover:underline transition-colors">
              {t("17ddfv4M9tfH3GJZtf6_r")}
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
};
