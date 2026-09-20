import React, { useState } from "react";
import { Modal, App, Button } from "antd";
import { QRCodeScanner } from "@/components/QRCodeScanner";
import { useTranslation } from "react-i18next";

interface PaymentModalProps {
  open: boolean;
  onCancel: () => void;
  amount: number | string;
  checkoutUrl?: string;
  loading?: boolean;
  onMockPay?: () => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onCancel,
  amount,
  checkoutUrl = "",
  loading = false,
  onMockPay,
}) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [paying, setPaying] = useState(false);

  const handleMockPay = async () => {
    if (!onMockPay) return;
    try {
      setPaying(true);
      await onMockPay();
    } catch (error) {
      console.error(error);
      message.error(error instanceof Error ? error.message : t("cFcF3RpiSV10fKSQvGa7N"));
    } finally {
      setPaying(false);
    }
  };

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
        <div className="text-xl font-bold text-gray-800 mb-6">
          {t("bilZpkT35pe7rc_kPqYzh")}{" "}
          <span className="text-primary mx-1">{amount}</span>{" "}
          {t("w3sCAov1HRR2xI673RFxr")}
        </div>

        <QRCodeScanner checkoutUrl={checkoutUrl} loading={loading} currency="CNY" />

        {onMockPay && (
          <Button
            type="primary"
            loading={paying}
            onClick={handleMockPay}
            className="mt-6 w-full h-10 rounded-lg"
          >
            模拟支付完成
          </Button>
        )}

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
