import React, { useState, useEffect } from "react";
import { Modal, Avatar, Spin, App, Button } from "antd";
import { UserOutlined, CloseOutlined } from "@ant-design/icons";
import { QRCodeScanner } from "../QRCodeScanner";
import { confirmPayment, createOrder, listPlans } from "@/api/commerce";
import { getProfile } from "@/api/auth";
import { useTranslation } from "react-i18next";
import { useUserStore } from "@/store/useUserStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PointPackage {
  id: string;
  name: string;
  price: number;
  pointsCount: number;
}

export const RechargeModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const userInfo = useUserStore((state) => state.memberInfo);
  const setMemberInfo = useUserStore((state) => state.setMemberInfo);
  const giftPoints = userInfo?.points ?? 0;

  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  const [qrLoading, setQrLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payInfo, setPayInfo] = useState<{
    order_id: string;
    checkout_url: string;
    amount: string;
    sign?: string;
    channel: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchPackages = async () => {
      setLoading(true);
      setPayInfo(null);
      setCheckoutUrl("");
      try {
        const data = await listPlans({ type: "points", current: 1, size: 100 });
        const sortedRecords: PointPackage[] = (data.records || [])
          .map((record) => ({
            id: record.id,
            name: record.name,
            price: Number(record.price),
            pointsCount: record.benefits?.points || record.benefits?.gift_points || 0,
          }))
          .sort((a, b) => a.price - b.price);

        setPackages(sortedRecords);
        if (sortedRecords.length > 0) {
          setSelectedId(sortedRecords[0].id);
          await fetchCheckoutUrl(sortedRecords[0].id);
        }
      } catch (error) {
        console.error("获取套餐异常:", error);
        message.error(error instanceof Error ? error.message : t("94nidbWrt1CrI2gvgGPry"));
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [open, message, t]);

  const fetchCheckoutUrl = async (id: string) => {
    if (!id) return;
    setQrLoading(true);
    try {
      const created = await createOrder({
        product_type: "points",
        product_id: id,
        channel: "mock",
      });
      setPayInfo({
        order_id: created.order.id,
        checkout_url: created.pay.checkout_url,
        amount: created.pay.amount,
        sign: created.pay.sign,
        channel: created.pay.channel,
      });
      setCheckoutUrl(created.pay.checkout_url);
    } catch (error) {
      console.error("获取支付链接异常:", error);
      message.error(error instanceof Error ? error.message : t("94nidbWrt1CrI2gvgGPry"));
      setPayInfo(null);
      setCheckoutUrl("");
    } finally {
      setQrLoading(false);
    }
  };

  const handleMockPay = async () => {
    if (!payInfo) return;
    try {
      setPaying(true);
      await confirmPayment({
        order_id: payInfo.order_id,
        channel: payInfo.channel,
        amount: payInfo.amount,
        sign: payInfo.sign,
      });
      try {
        const profile = await getProfile();
        setMemberInfo(profile);
      } catch {
        // profile refresh is best-effort after payment
      }
      message.success(t("dUkKpAa_rS-QrvFdWDxpo"));
      onClose();
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
            src={userInfo?.avatar_url}
            icon={!userInfo?.avatar_url && <UserOutlined />}
            className="bg-white text-gray-500"
          />
          <span className="text-base font-medium">
            {userInfo?.nickname || "user"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            🔥 <span>{t("iOvn0ncUeUNA82PEm-AtF")}</span> {giftPoints}
          </span>
          <CloseOutlined
            className="cursor-pointer text-lg text-gray-300 hover:text-white transition-colors"
            onClick={onClose}
          />
        </div>
      </div>

      <div className="bg-white p-6 flex gap-8 rounded-b-xl min-h-[350px] relative">
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
              const isSelected = selectedId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => {
                    setSelectedId(pkg.id);
                    fetchCheckoutUrl(pkg.id);
                  }}
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer border transition-all
                    ${isSelected
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
          <QRCodeScanner
            checkoutUrl={checkoutUrl}
            loading={qrLoading}
            amount={packages.find((p) => p.id === selectedId)?.price}
          />

          {payInfo && (
            <Button
              type="primary"
              loading={paying || qrLoading}
              onClick={handleMockPay}
              className="mt-4 w-full h-9 rounded-lg"
            >
              模拟支付完成
            </Button>
          )}

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
