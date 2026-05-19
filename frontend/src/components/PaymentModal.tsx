import React, { useState, useEffect } from "react";
import { Modal, App } from "antd"; 
import { QRCodeScanner } from "@/components/QRCodeScanner";
import { useTranslation } from "react-i18next";
import { add } from "@/api/order";

interface PaymentModalProps {
  open: boolean;
  onCancel: () => void;
  amount: number | string;
  orderId: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onCancel,
  amount,
  orderId,
}) => {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      const fetchCheckoutUrl = async () => {
        setLoading(true);
        try {
          const res = await add({ id: orderId });
          if (res.successful && res.data?.checkoutUrl) {
            setCheckoutUrl(res.data.checkoutUrl);
          } else {
            message.error(res.message || t("cFcF3RpiSV10fKSQvGa7N"));
          }
        } catch (error) {
          console.error("获取支付链接报错:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchCheckoutUrl();
    } else {
      // 关闭时清空
      setCheckoutUrl("");
    }
  }, [open, orderId, message, t]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      title={null}
      centered
      width={400}
      classNames={{ container: "rounded-2xl p-0" }}
    >
      <div className="pt-10 pb-6 px-6 flex flex-col items-center animate-fade-in">
        {/* 弹窗标题 */}
        <div className="text-xl font-bold text-gray-800 mb-6">
          {t("bilZpkT35pe7rc_kPqYzh")}{" "}
          <span className="text-primary mx-1">{amount}</span>{" "}
          {t("w3sCAov1HRR2xI673RFxr")}
        </div>

        {/* 引入复用的二维码组件 */}
        <QRCodeScanner checkoutUrl={checkoutUrl} loading={loading} />

        {/* 底部服务协议 */}
        <div className="text-[12px] text-gray-400 mt-8">
          {t("pXNQr6vug-33Su5C0L3ag")}
          <a className="text-primary hover:text-secondary transition-colors cursor-pointer">
            {t("17ddfv4M9tfH3GJZtf6_r")}
          </a>
        </div>
      </div>
    </Modal>
  );
};
