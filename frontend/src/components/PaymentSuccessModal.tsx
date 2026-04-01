import React from "react";
import { Modal, Button } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
interface PaymentSuccessModalProps {
  open: boolean;
  onCancel: () => void;
  amount: string;
  payMethod: string;
  payTime: string;
  onReturnHome: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  open,
  onCancel,
  amount,
  payMethod,
  payTime,
  onReturnHome,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      title={
        <span className="font-bold text-gray-800">
          {t("dUkKpAa_rS-QrvFdWDxpo")}
        </span>
      } // 左上角标题
      centered
      width={400}
      classNames={{ container: "rounded-2xl", header: "mb-0" }}
    >
      <div className="flex flex-col items-center pt-8 pb-2 animate-fade-in">
        {/* 成功图标 (蓝底白勾/蓝圈蓝勾，高度还原原型) */}
        <div className="w-16 h-16 rounded-full border-[3px] border-primary flex items-center justify-center mb-5 bg-[#f0f2ff]">
          <CheckOutlined className="text-3xl text-primary font-bold" />
        </div>

        {/* 标题与金额 */}
        <div className="text-[16px] font-bold text-gray-800 mb-1">
          {t("dUkKpAa_rS-QrvFdWDxpo")}
        </div>
        <div className="text-primary font-bold mb-8 flex items-baseline tracking-tight">
          <span className="text-3xl">
            {t("AtnGVfDt06LkXbQwoqYoF")}
            {amount.split(".")[0]}
          </span>
          <span className="text-xl">.{amount.split(".")[1] || "00"}</span>
        </div>

        {/* 订单详情信息列 */}
        <div className="w-full px-4 flex flex-col gap-3.5 mb-10 text-[13px]">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">{t("y8ZiGQDTe9O2lfWjHdmF2")}</span>
            <span className="text-gray-800">{payMethod}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">{t("Lvjf2N61ByG8Fdmj5L3Qg")}</span>
            <span className="text-gray-800">{payTime}</span>
          </div>
        </div>

        {/* 底部按钮 */}
        <Button
          type="primary"
          onClick={onReturnHome}
          className="w-full h-11 bg-primary hover:bg-secondary border-none rounded-lg text-[15px] font-medium tracking-wide shadow-md shadow-indigo-500/20"
        >
          {t("gdzy20Kt4ZAQk2I2vT4af")}
        </Button>
      </div>
    </Modal>
  );
};
