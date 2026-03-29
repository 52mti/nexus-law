import request from '@/utils/request'

// 1. 定义入参类型（严格对应后端的 DTO）
export interface SearchRegulationParams {
  lawType: string
  articleNumber?: string
  keyword: string
}

// 2. 定义出参类型（根据你的拦截器，最终拿到的是包含 data 字段的对象）
interface SearchRegulationResponse {
  code: number
  message: string
  data: string // 后端返回的 Markdown 字符串
}

// 3. 导出请求函数
export const searchRegulationApi = (data: SearchRegulationParams) => {
  // 因为你的拦截器直接 return 了 response.data，所以这里泛型传入即可
  return request.post<any, SearchRegulationResponse>('/api/regulation/search', data)
}

// ==========================================
// 🚀 新增：法律条文类型 (DocType) 相关的类型定义
// ==========================================

export interface LegalProvisionsType {
  /** 唯一主键 ID */
  id: string;
  /** 字典编码 (如: "ANY", "XZSSF", "GSF") */
  code: string;
  /** 字典名称 (如: "不限/综合匹配", "行政诉讼法") */
  name: string;
  /** 状态 (如: 1 启用) */
  status: number;

  // --- 以下为继承的审计基础字段 (按需使用) ---
  createBy?: string;
  createName?: string;
  createTime?: string;
  lastModifyBy?: string | null;
  lastModifyName?: string | null;
  deleted?: boolean;
}

export interface IPageLegalProvisionsType {
  records: LegalProvisionsType[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface ResultIPageLegalProvisionsType {
  successful: boolean;
  code: number;
  status: number;
  message: string;
  msg: string;
  timestamp: number;
  data: IPageLegalProvisionsType;
}

// ==========================================
// 接口定义
// ==========================================

/**
 * 分页查询法律条文类型列表
 */
export const fetchDocType = (data: { current?: number; size?: number } = {}) => {
  // 🚀 将 any 替换为刚刚定义的 ResultIPageLegalProvisionsType，并支持可选的分页入参
  return request.post<any, ResultIPageLegalProvisionsType>('/legalProvisionsType/pageList', data);
};