import request from '@/utils/request';

// ==========================================
// 1. 数据类型定义 (Interfaces)
// ==========================================

export interface RangeQueryDto {
  /** 开始时间 */
  name?: string;
  /** 开始时间 */
  startDate?: string;
  /** 结束时间 */
  endDate?: string;
}

export interface PlanSubscription {
  /** ID */
  id: string;
  /** 创建人ID */
  createBy?: string;
  /** 创建人名称 */
  createName?: string;
  /** 创建时间 */
  createTime?: string;
  /** 最后修改人ID */
  lastModifyBy?: string;
  /** 最后修改人名称 */
  lastModifyName?: string;
  /** 逻辑删除 */
  deleted?: boolean;

  // --- 分页与请求相关的冗余字段 (建议后端忽略或你按需保留) ---
  current?: number;
  size?: number;
  head?: string[][];
  include?: string[];
  rangeQueryDtoList?: RangeQueryDto[];
  editFieldList?: string[];

  // ==========================================
  // 🚀 核心业务字段 (根据真实 JSON 补充)
  // ==========================================
  /** 会员代码 (如: ZSHY) */
  code?: string;
  /** 会员名称 (如: 钻石会员) */
  name?: string;
  /** 会员Logo图片地址 */
  logo?: string | null;
  /** 套餐提示说明 (如: 单月66元 0.66元/100积分) */
  hint?: string;
  /** 套餐价格 (如: 799.0000) */
  price?: number;
  /** 每月获得积分数 (如: 10000) */
  gainPointsPerMonth?: number;
}

export interface IPagePlanSubscription {
  current?: number;
  size?: number;
  records?: PlanSubscription[];
  total?: number;
  pages?: number;
}

export interface ResultIPagePlanSubscription {
  /** 是否成功 */
  successful?: boolean;
  /** 消息状态码 */
  code?: number;
  /** 消息状态 */
  status?: number;
  /** 消息内容 (中文) */
  message?: string;
  /** 消息内容 (英文 SUCCESS) */
  msg?: string;
  /** 时间戳 */
  timestamp?: number;
  /** 真实分页数据 */
  data?: IPagePlanSubscription;
}

// ==========================================
// 2. 接口定义 (API Functions)
// ==========================================

/**
 * 分页查询会员套餐列表
 */
export const MembershipPlan = () => {
  // 注意：虽然名字叫 pageList，但你当前没传 current 和 size，如果后端需要可以在对象里加上 { current: 1, size: 20 }
  return request.post<any, ResultIPagePlanSubscription>('/membershipPlan/pageList', {});
};