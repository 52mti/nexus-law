import request from '@/utils/request';

// ==========================================
// 1. 数据类型定义 (Interfaces)
// ==========================================

export interface RebateRecord {
  id?: string;
  createTime?: string;
  actionName?: string;
  rebateAmount?: string | number;
  withdrawableAmount?: string | number;
  [key: string]: any;
}

export interface IPageRebateRecord {
  records?: RebateRecord[];
  total?: number;
  size?: number;
  current?: number;
}

export interface ResultIPageRebateRecord {
  successful?: boolean;
  code?: number;
  message?: string;
  data?: IPageRebateRecord;
}

export interface PageQuery {
  current?: number;
  size?: number;
  [key: string]: any;
}

// ==========================================
// 2. 接口定义 (API Functions)
// ==========================================

/**
 * 分页查询返利列表
 */
export const getRebatePageList = (data: PageQuery) => {
  return request.post<any, ResultIPageRebateRecord>('/rebate/pageList', data);
};
