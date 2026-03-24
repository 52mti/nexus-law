// src/types/chapa.d.ts

// 1. 定义 Chapa 支付配置参数的接口
export interface ChapaCheckoutOptions {
  public_key: string;
  tx_ref: string;
  amount: number | string;
  currency: 'ETB' | 'USD'; // 根据你需要支持的货币进行字面量限制
  email: string;
  first_name?: string; // 可选参数用 ?
  last_name?: string;
  phone_number?: string; // 格式通常为 09xxxxxxxx
  title?: string;
  description?: string;
  logo?: string;
  callback_url?: string;
  return_url?: string;
  onClose?: () => void;
}

// 2. 扩展全局 Window 接口
declare global {
  interface Window {
    // 声明 window 下可能存在 ChapaCheckout 方法
    ChapaCheckout?: (options: ChapaCheckoutOptions) => void;
  }
}

// 注意：如果这个文件没有任何 import/export，TypeScript 会把它当作全局脚本。
// 加上 export {} 确保它被当作一个模块处理（如果你的 tsconfig 配置需要）。
export {};