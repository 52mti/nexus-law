// src/api/payment.ts
import request from '@/utils/request'

// ==========================================
// Chapa 支付相关接口
// ==========================================

// 1. 获取支付链接的请求参数类型
export interface ChapaPaymentRequest {
  amount: number;
  email: string;
  firstName?: string; // 可选
  lastName?: string;  // 可选
}

// 2. 获取支付链接的响应数据类型
export interface ChapaPaymentResponse {
  code: number
  data: {
    checkoutUrl: string; // Chapa 返回的真实支付链接 (用于生成二维码)
    txRef: string;       // 后端生成的唯一订单流水号 (用于后续查单)
  }
}

// 3. 查单接口的响应数据类型
export interface PaymentStatusResponse {
  code: number
  data: {
    status: 'PENDING' | 'PAID' | 'FAILED'; // 订单状态
  }
}

/**
 * 接口：生成 Chapa 支付链接 (Checkout URL)
 * @param data 订单金额和用户信息
 */
export const fetchPaymentUrl = (data: ChapaPaymentRequest): Promise<ChapaPaymentResponse> => {
  // 这里的 '/payment/chapa/generate-url' 请替换为你后端实际定义的路由
  return request.post('/payment/chapa/generate-url', data)
}

/**
 * 接口：查询订单支付状态 (用于前端轮询)
 * @param txRef 订单流水号
 */
export const checkPaymentStatus = (txRef: string): Promise<PaymentStatusResponse> => {
  // 通常查单使用 GET 请求，将订单号拼在 URL 后面
  return request.get(`/payment/chapa/status/${txRef}`)
}