import React, { useState, useEffect } from "react";
import { Table, App } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { ContainerOutlined } from "@ant-design/icons";
import Copiright from "@/components/Copiright";
import { PageContainer } from "@/components/layout/PageContainer";

// 🚀 1. 引入真实 API
import { confirmPayment, listOrders } from "@/api/commerce";

// 引入刚刚写好的两个弹窗组件
import { PaymentModal } from "@/components/PaymentModal";
import { PaymentSuccessModal } from "@/components/PaymentSuccessModal";
import { useTranslation } from "react-i18next";
// ==========================================
// 1. 类型定义
// ==========================================
type OrderStatus = "pending" | "cancelled" | "success";

interface OrderRecord {
  key: string;
  orderId: string;
  orderType: string;
  amount: number;
  amountText: string;
  status: OrderStatus;
  orderTime: string;
  payTime: string;
  payMethod: string;
}

// ==========================================
// 3. 主页面组件
// ==========================================
export const OrderListPage: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  // 分页管理
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 管理弹窗状态与当前订单
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderRecord | null>(null);

  // ==========================================
  // 2. 表格列配置 (改为函数返回，以便接收点击事件)
  // ==========================================
  const getColumns = (
    onPayClick: (record: OrderRecord) => void,
  ): ColumnsType<OrderRecord> => [
    {
      title: t("p0GYPXmFZGVHvZH1Rej_5"),
      dataIndex: "orderId",
      key: "orderId",
      className: "text-gray-600",
    },
    {
      title: t("gr3qBMJvbe5JPak40f9Dt"),
      dataIndex: "orderType",
      key: "orderType",
      className: "text-gray-600",
    },
    {
      title: t("YRV_gbaDGbKoBLMQ36sss"),
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => (
        <span className="text-gray-800 font-medium">
          {t("AtnGVfDt06LkXbQwoqYoF")} {amount}
        </span>
      ),
    },
    {
      title: t("M5QrLfU9yiVy8Nj6eTyl_"),
      dataIndex: "status",
      key: "status",
      render: (status: OrderStatus) => {
        const statusConfig = {
          pending: {
            text: t("tc-GpWY5EJGdfnQr2afB4"),
            dotClass: "bg-primary",
            textClass: "text-gray-800",
          },
          cancelled: {
            text: t("VAGz0cG-fASv8cFIN1rfC"),
            dotClass: "bg-gray-400",
            textClass: "text-gray-500",
          },
          success: {
            text: t("dUkKpAa_rS-QrvFdWDxpo"),
            dotClass: "bg-emerald-500",
            textClass: "text-gray-800",
          },
        };
        const config = statusConfig[status];

        return (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
            <span className={config.textClass}>{config.text}</span>
          </div>
        );
      },
    },
    {
      title: t("oPYRazwKKs5NEruaSa78D"),
      dataIndex: "orderTime",
      key: "orderTime",
      className: "text-gray-600",
    },
    {
      title: t("ij7PwuHJyncGgnlU3aset"),
      dataIndex: "payTime",
      key: "payTime",
      className: "text-gray-600",
    },
    {
      title: t("7UziSpRSO7qa83USM0ZCl"),
      dataIndex: "payMethod",
      key: "payMethod",
      className: "text-gray-600",
    },
    {
      title: t("8b26T1_-oaykcS5OeE1T9"),
      key: "action",
      render: (_, record) => {
        if (record.status === "pending") {
          return (
            <span
              className="text-primary hover:text-secondary cursor-pointer transition-colors"
              onClick={() => onPayClick(record)}
            >
              {t("MAEnR5wqLY35M1jbWXlKh")}{" "}
            </span>
          );
        }
        return null;
      },
    },
  ];

  // ==========================================
  // 🚀 核心转换函数：后端状态码 -> 前端 UI 状态
  // ==========================================
  const mapOrderStatus = (backendStatus: string): OrderStatus => {
    switch (backendStatus) {
      case "pending":
        return "pending";
      case "cancelled":
      case "refunded":
        return "cancelled";
      case "paid":
      case "fulfilled":
        return "success";
      default:
        return "pending";
    }
  };

  const mapOrderCategory = (productType: string): string => {
    switch (productType) {
      case "points":
        return t("WY1sMdes6qqNehQ_kLAR3");
      case "plan":
        return t("Z0YK7LvZommeyRWSpdwPI");
      default:
        return t("jRrMDig89W3rFESkgn73y");
    }
  };

  const fetchOrderList = async (current = 1, size = 10) => {
    setLoading(true);
    try {
      const data = await listOrders({ current, size });
      const formattedOrders: OrderRecord[] = (data.records || []).map((item) => ({
        key: item.id,
        orderId: item.id,
        orderType: mapOrderCategory(item.product_type),
        amount: Number(item.amount),
        status: mapOrderStatus(item.status),
        orderTime: item.created_at?.replace("T", " ").substring(0, 19) || "-",
        payTime: item.paid_at?.replace("T", " ").substring(0, 19) || "-",
        payMethod: item.channel || "-",
        amountText: item.amount,
      }));

      setOrders(formattedOrders);
      setPagination((prev) => ({
        ...prev,
        current: data.current,
        total: data.total,
        pageSize: data.size,
      }));
    } catch (error) {
      console.error("获取订单列表异常:", error);
      message.error(error instanceof Error ? error.message : t("nb0Sk89VO40u9AvV8pNpb"));
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时拉取第一页数据
  useEffect(() => {
    fetchOrderList(pagination.current, pagination.pageSize);
  }, []);

  // 监听表格底部的分页器点击事件
  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchOrderList(newPagination.current || 1, newPagination.pageSize || 10);
    // 更新本地分页状态，主要是为了切换 pageSize 时记住
    setPagination((prev) => ({
      ...prev,
      pageSize: newPagination.pageSize || 10,
    }));
  };

  // 点击“立即支付”时的处理逻辑
  const handlePayClick = (record: OrderRecord) => {
    setCurrentOrder(record);
    setIsPaymentModalOpen(true);
  };

  const handleMockPay = async () => {
    if (!currentOrder) return;
    await confirmPayment({
      order_id: currentOrder.orderId,
      channel: currentOrder.payMethod || "mock",
      amount: currentOrder.amountText,
    });
    setIsPaymentModalOpen(false);
    setIsSuccessModalOpen(true);
    await fetchOrderList(pagination.current, pagination.pageSize);
  };

  return (
    <PageContainer>
      <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 pb-2 mb-6 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-6 px-2">
            <ContainerOutlined className="text-primary text-lg" />
            <span className="text-[16px] font-bold text-gray-800">
              {t("yxWKVBaXoFueyNaCnfMph")}{" "}
            </span>
          </div>

          <div className="flex-1 [&_.ant-table-thead>tr>th]:bg-[#f7f8fb] [&_.ant-table-thead>tr>th]:text-gray-600 [&_.ant-table-thead>tr>th]:font-bold [&_.ant-table-thead>tr>th]:border-b-0 [&_.ant-table-cell]:py-4">
            <Table
              columns={getColumns(handlePayClick)}
              dataSource={orders} // 使用真实数据
              loading={loading} // 加上加载遮罩
              onChange={handleTableChange} // 绑定分页切换事件
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                placement: ["bottomCenter"],
                showSizeChanger: true,
                className: "mt-8 mb-4",
              }}
              rowClassName="hover:bg-gray-50/50 transition-colors"
            />
          </div>
        </div>

        <Copiright />

        {/* ========================================== */}
        {/* 弹窗挂载区域 */}
        {/* ========================================== */}

        {/* 1. 扫码支付弹窗 */}
        <PaymentModal
          open={isPaymentModalOpen}
          onCancel={() => setIsPaymentModalOpen(false)}
          amount={currentOrder?.amount || 0}
          checkoutUrl={currentOrder ? `nexus-law://pay/${currentOrder.orderId}` : ""}
          onMockPay={handleMockPay}
        />

        {/* 2. 支付成功弹窗 */}
        <PaymentSuccessModal
          open={isSuccessModalOpen}
          onCancel={() => setIsSuccessModalOpen(false)}
          amount={currentOrder?.amount.toFixed(2) || "0.00"}
          payMethod={t("sME-RHhfPM1L_fQtihaHw")}
          payTime={new Date()
            .toLocaleString("zh-CN", { hour12: false })
            .replace(/\//g, "-")}
          onReturnHome={() => {
            setIsSuccessModalOpen(false);
            message.info(t("9QRFkDEwSoKxG3Tk7snkB"));
          }}
        />
      </div>
    </PageContainer>
  );
};

export default OrderListPage;
