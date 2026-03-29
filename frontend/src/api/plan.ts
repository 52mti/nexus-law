import request from '@/utils/request';

// ==========================================
// 1. 数据类型定义 (Interfaces)
// ==========================================

export interface PlanSubscriptionSaveReq {
  /** 套餐ID */
  planId: string;
  /** 租户ID */
  tenantId: string;
  /** 用户数量 */
  userNum: number;
  /** 月数 */
  monthNum: number;
  /** 用户单价 */
  licensePrice?: number;
  /** 总金额 */
  totalAmount?: number;
  /** 优惠金额 */
  discountAmount?: number;
  /** 结算单价 */
  statementPrice?: number;
  /** 结算金额 */
  statementAmount?: number;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 支付状态(0=待支付;10=部分支付;20=已支付) */
  paymentStatus?: string;
  /** 描述 */
  description?: string;
}

export interface ProductDefinitionSaveReq {
  /** 套餐名称 */
  name: string;
  /** 套餐Logo链接 */
  logo?: string;
  /** 套餐描述 */
  description?: string;
  /** 套餐关联资源ID */
  itemIdList: string[];
}

export interface RolePermissionResp {
  /** 菜单ID */
  menuIdList?: string[];
  /** 按钮ID */
  buttonIdList?: string[];
}

export interface ProductDefPermissionReq {
  /** 套餐定义ID */
  planId: string;
  /** 权限资源ID */
  resIdList: string[];
}

export interface PlanSubscription {
  /** ID */
  id?: string;
  /** 创建人ID */
  createBy?: string;
  /** 创建人名称 */
  createName?: string;
  /** 创建时间 */
  createTime?: string;
  head?: string[][];
  include?: string[];
  /** 最后修改人ID */
  lastModifyBy?: string;
  /** 最后修改人名称 */
  lastModifyName?: string;
  /** 逻辑删除 */
  deleted?: boolean;
  /** 当前页码 */
  current?: number;
  /** 分页大小 */
  size?: number;
  rangeQueryDtoList?: RangeQueryDto[];
  editFieldList?: string[];
  /** 套餐ID */
  planId?: number;
  /** 租户ID */
  tenantId?: number;
  /** 用户数量 */
  userNum?: number;
  /** 月数 */
  monthNum?: number;
  /** 用户单价 */
  licensePrice?: number;
  /** 总金额 */
  totalAmount?: number;
  /** 优惠金额 */
  discountAmount?: number;
  /** 结算单价 */
  statementPrice?: number;
  /** 结算金额 */
  statementAmount?: number;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 支付状态(0=待支付;10=部分支付;20=已支付) */
  paymentStatus?: string;
  /** 描述信息 */
  description?: string;
}

export interface ResultBoolean {
  /** 是否成功 */
  successful?: boolean;
  /** 消息ID */
  code?: number;
  /** 消息ID */
  status?: number;
  /** 消息内容 */
  message?: string;
  /** 消息内容 */
  msg?: string;
  /** 时间戳 */
  timestamp?: number;
  /** 返回数据 */
  data?: boolean;
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
  /** 消息ID */
  code?: number;
  /** 消息ID */
  status?: number;
  /** 消息内容 */
  message?: string;
  /** 消息内容 */
  msg?: string;
  /** 时间戳 */
  timestamp?: number;
  data?: IPagePlanSubscription;
}

export interface ExcelWriteFile {
  fileName: string;
  template?: string;
  excelType: string;
  writerType?: string;
  inMemory?: boolean;
  head?: string[][];
  include?: string[];
  exclude?: string[];
  password?: string;
  sheetList: SheetInfo[];
  i18nHeader?: boolean;
  data?: any;
}

export interface IdList {
  /** id集合 */
  idList?: string[];
  methodNameList?: string[];
}

export interface ResultMapStringString {
  /** 是否成功 */
  successful?: boolean;
  /** 消息ID */
  code?: number;
  /** 消息ID */
  status?: number;
  /** 消息内容 */
  message?: string;
  /** 消息内容 */
  msg?: string;
  /** 时间戳 */
  timestamp?: number;
  /** 返回数据 */
  data?: any;
}

export interface ResultListPlanSubscription {
  /** 是否成功 */
  successful?: boolean;
  /** 消息ID */
  code?: number;
  /** 消息ID */
  status?: number;
  /** 消息内容 */
  message?: string;
  /** 消息内容 */
  msg?: string;
  /** 时间戳 */
  timestamp?: number;
  /** 返回数据 */
  data?: PlanSubscription[];
}

export interface FieldNameAndValue {
  fieldName?: string;
  value?: string;
}

export interface Name {
  /** name */
  name?: string;
}

export interface ResultString {
  /** 是否成功 */
  successful?: boolean;
  /** 消息ID */
  code?: number;
  /** 消息ID */
  status?: number;
  /** 消息内容 */
  message?: string;
  /** 消息内容 */
  msg?: string;
  /** 时间戳 */
  timestamp?: number;
  /** 返回数据 */
  data?: string;
}

export interface Id {
  /** id */
  id?: string;
}

export interface ResultPlanSubscription {
  /** 是否成功 */
  successful?: boolean;
  /** 消息ID */
  code?: number;
  /** 消息ID */
  status?: number;
  /** 消息内容 */
  message?: string;
  /** 消息内容 */
  msg?: string;
  /** 时间戳 */
  timestamp?: number;
  data?: PlanSubscription;
}

export interface PlanDefinition {
  /** ID */
  id?: string;
  /** 创建人ID */
  createBy?: string;
  /** 创建人名称 */
  createName?: string;
  /** 创建时间 */
  createTime?: string;
  head?: string[][];
  include?: string[];
  /** 最后修改人ID */
  lastModifyBy?: string;
  /** 最后修改人名称 */
  lastModifyName?: string;
  /** 逻辑删除 */
  deleted?: boolean;
  /** 当前页码 */
  current?: number;
  /** 分页大小 */
  size?: number;
  rangeQueryDtoList?: RangeQueryDto[];
  editFieldList?: string[];
  /** 套餐名称 */
  name?: string;
  /** 套餐编码 */
  code?: string;
  /** 套餐Logo链接 */
  logo?: string;
  /** 套餐详情 */
  description?: string;
  /** 启用状态 */
  status?: boolean;
}

export interface IPagePlanDefinition {
  current?: number;
  size?: number;
  records?: PlanDefinition[];
  total?: number;
  pages?: number;
}

export interface ResultIPagePlanDefinition {
  /** 是否成功 */
  successful?: boolean;
  /** 消息ID */
  code?: number;
  /** 消息ID */
  status?: number;
  /** 消息内容 */
  message?: string;
  /** 消息内容 */
  msg?: string;
  /** 时间戳 */
  timestamp?: number;
  data?: IPagePlanDefinition;
}

export interface ResultListPlanDefinition {
  /** 是否成功 */
  successful?: boolean;
  /** 消息ID */
  code?: number;
  /** 消息ID */
  status?: number;
  /** 消息内容 */
  message?: string;
  /** 消息内容 */
  msg?: string;
  /** 时间戳 */
  timestamp?: number;
  /** 返回数据 */
  data?: PlanDefinition[];
}

export interface ResultPlanDefinition {
  /** 是否成功 */
  successful?: boolean;
  /** 消息ID */
  code?: number;
  /** 消息ID */
  status?: number;
  /** 消息内容 */
  message?: string;
  /** 消息内容 */
  msg?: string;
  /** 时间戳 */
  timestamp?: number;
  data?: PlanDefinition;
}

export interface IPagePlanSubscriptionPageResp {
  current?: number;
  size?: number;
  records?: PlanSubscriptionPageResp[];
  total?: number;
  pages?: number;
}

export interface PlanDefinitionDetailResp {
  /** ID */
  id?: number;
  /** 套餐编码 */
  code?: string;
  /** 套餐名称 */
  name?: string;
  /** 套餐Logo链接 */
  logo?: string;
  /** 套餐详情 */
  description?: string;
  /** 启用状态 */
  status?: boolean;
  /** 创建人 */
  createName?: string;
  /** 创建时间 */
  createTime?: string;
  /** 套餐关联资源ID */
  itemIdList?: string[];
}

export interface IPagePlanDefinitionPageResp {
  current?: number;
  size?: number;
  records?: PlanDefinitionPageResp[];
  total?: number;
  pages?: number;
}

export interface RangeQueryDto {
  /** 开始时间 */
  name?: string;
  /** 开始时间 */
  startDate?: string;
  /** 结束时间 */
  endDate?: string;
}

export interface SheetInfo {
  sheetNo?: number;
  name?: string;
  includes?: string[];
  excludes?: string[];
  head?: string[][];
  ignoreFields?: string[];
}

export interface PlanSubscriptionPageResp {
  /** ID */
  id?: number;
  /** 套餐ID */
  planId?: number;
  /** 租户ID */
  tenantId?: number;
  /** 用户数量 */
  userNum?: number;
  /** 月数 */
  monthNum?: number;
  /** 用户单价 */
  licensePrice?: number;
  /** 总金额 */
  totalAmount?: number;
  /** 优惠金额 */
  discountAmount?: number;
  /** 结算单价 */
  statementPrice?: number;
  /** 结算金额 */
  statementAmount?: number;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 支付状态(0=待支付;10=部分支付;20=已支付) */
  paymentStatus?: string;
  /** 描述 */
  description?: string;
  /** 创建人 */
  createName?: string;
  /** 创建时间 */
  createTime?: string;
}

export interface PlanDefinitionPageResp {
  /** ID */
  id?: number;
  /** 套餐编码 */
  code?: string;
  /** 套餐名称 */
  name?: string;
  /** 套餐Logo链接 */
  logo?: string;
  /** 套餐详情 */
  description?: string;
  /** 启用状态 */
  status?: boolean;
  /** 创建人 */
  createName?: string;
  /** 创建时间 */
  createTime?: string;
}

// ==========================================
// 2. 接口定义 (API Functions)
// ==========================================

/**
 * 编辑订阅
 */
export const {id}PlanSubscriptions = (data?: { id: number } | any) => {
  return request.put<any, any>('/plan-subscriptions/{id}', data);
};

/**
 * 删除订阅
 */
export const {id}PlanSubscriptions = (data?: { id: number } | any) => {
  return request.delete<any, any>('/plan-subscriptions/{id}', data);
};

/**
 * 编辑套餐
 */
export const {id}PlanDefinitions = (data?: { id: string } | any) => {
  return request.put<any, any>('/plan-definitions/{id}', data);
};

/**
 * 删除套餐
 */
export const {id}PlanDefinitions = (data?: { id: string } | any) => {
  return request.delete<any, any>('/plan-definitions/{id}', data);
};

/**
 * 编辑套餐
 */
export const getPermissionsPlanDefinitions = (data?: { id: string } | any) => {
  return request.get<any, RolePermissionResp>('/plan-definitions/{id}/permissions', { params: data });
};

/**
 * 套餐授权
 */
export const permissionsPlanDefinitions = (data?: { id: string } | any) => {
  return request.put<any, any>('/plan-definitions/{id}/permissions', data);
};

/**
 * 添加订阅
 */
export const postPlanSubscriptions = (data?: PlanSubscriptionSaveReq) => {
  return request.post<any, any>('/plan-subscriptions', data);
};

/**
 * 保存或更新
 */
export const saveOrUpdatePlanSubscriptions = (data?: PlanSubscription) => {
  return request.post<any, ResultBoolean>('/plan-subscriptions/saveOrUpdate', data);
};

/**
 * 原生分页查询
 */
export const pageOnlyPlanSubscriptions = (data?: PlanSubscription) => {
  return request.post<any, IPagePlanSubscription>('/plan-subscriptions/pageOnly', data);
};

/**
 * 分页查询
 */
export const pageListPlanSubscriptions = (data?: PlanSubscription) => {
  return request.post<any, ResultIPagePlanSubscription>('/plan-subscriptions/pageList', data);
};

/**
 * 列表查询
 */
export const listPlanSubscriptions = (data?: PlanSubscription) => {
  return request.post<any, PlanSubscription[]>('/plan-subscriptions/list', data);
};

/**
 * 导入Excel
 */
export const importExcelPlanSubscriptions = (data?: any) => {
  return request.post<any, ExcelWriteFile>('/plan-subscriptions/importExcel', data);
};

/**
 * getNamesByIdList_10
 */
export const getNamesByIdListPlanSubscriptions = (data?: IdList) => {
  return request.post<any, ResultMapStringString>('/plan-subscriptions/getNamesByIdList', data);
};

/**
 * getListByIdIn_10
 */
export const getListByIdInPlanSubscriptions = (data?: IdList) => {
  return request.post<any, ResultListPlanSubscription>('/plan-subscriptions/getListByIdIn', data);
};

/**
 * getListByField_10
 */
export const getListByFieldPlanSubscriptions = (data?: FieldNameAndValue) => {
  return request.post<any, ResultListPlanSubscription>('/plan-subscriptions/getListByField', data);
};

/**
 * getIdByName_10
 */
export const getIdByNamePlanSubscriptions = (data?: Name) => {
  return request.post<any, ResultString>('/plan-subscriptions/getIdByName', data);
};

/**
 * 获取详情
 */
export const getByIdPlanSubscriptions = (data?: Id) => {
  return request.post<any, ResultPlanSubscription>('/plan-subscriptions/getById', data);
};

/**
 * 导出Excel
 */
export const exportExcelPlanSubscriptions = (data?: PlanSubscription) => {
  return request.post<any, ExcelWriteFile>('/plan-subscriptions/exportExcel', data);
};

/**
 * 删除
 */
export const removePlanSubscriptions = (data?: IdList) => {
  return request.post<any, ResultBoolean>('/plan-subscriptions/delete', data);
};

/**
 * 添加套餐
 */
export const postPlanDefinitions = (data?: ProductDefinitionSaveReq) => {
  return request.post<any, any>('/plan-definitions', data);
};

/**
 * 保存或更新
 */
export const saveOrUpdatePlanDefinitions = (data?: PlanDefinition) => {
  return request.post<any, ResultBoolean>('/plan-definitions/saveOrUpdate', data);
};

/**
 * 原生分页查询
 */
export const pageOnlyPlanDefinitions = (data?: PlanDefinition) => {
  return request.post<any, IPagePlanDefinition>('/plan-definitions/pageOnly', data);
};

/**
 * 分页查询
 */
export const pageListPlanDefinitions = (data?: PlanDefinition) => {
  return request.post<any, ResultIPagePlanDefinition>('/plan-definitions/pageList', data);
};

/**
 * 套餐列表
 */
export const listPlanDefinitions = (data?: { name: string, status: boolean } | any) => {
  return request.get<any, DictObject[]>('/plan-definitions/list', { params: data });
};

/**
 * 列表查询
 */
export const listPlanDefinitions = (data?: PlanDefinition) => {
  return request.post<any, PlanDefinition[]>('/plan-definitions/list', data);
};

/**
 * 导入Excel
 */
export const importExcelPlanDefinitions = (data?: any) => {
  return request.post<any, ExcelWriteFile>('/plan-definitions/importExcel', data);
};

/**
 * getNamesByIdList_11
 */
export const getNamesByIdListPlanDefinitions = (data?: IdList) => {
  return request.post<any, ResultMapStringString>('/plan-definitions/getNamesByIdList', data);
};

/**
 * getListByIdIn_11
 */
export const getListByIdInPlanDefinitions = (data?: IdList) => {
  return request.post<any, ResultListPlanDefinition>('/plan-definitions/getListByIdIn', data);
};

/**
 * getListByField_11
 */
export const getListByFieldPlanDefinitions = (data?: FieldNameAndValue) => {
  return request.post<any, ResultListPlanDefinition>('/plan-definitions/getListByField', data);
};

/**
 * getIdByName_11
 */
export const getIdByNamePlanDefinitions = (data?: Name) => {
  return request.post<any, ResultString>('/plan-definitions/getIdByName', data);
};

/**
 * 获取详情
 */
export const getByIdPlanDefinitions = (data?: Id) => {
  return request.post<any, ResultPlanDefinition>('/plan-definitions/getById', data);
};

/**
 * 导出Excel
 */
export const exportExcelPlanDefinitions = (data?: PlanDefinition) => {
  return request.post<any, ExcelWriteFile>('/plan-definitions/exportExcel', data);
};

/**
 * 删除
 */
export const removePlanDefinitions = (data?: IdList) => {
  return request.post<any, ResultBoolean>('/plan-definitions/delete', data);
};

/**
 * 分页查询
 */
export const pagePlanSubscriptions = (data?: { req: PageRequest, tenantId: string, planId: string, status: boolean } | any) => {
  return request.get<any, IPagePlanSubscriptionPageResp>('/plan-subscriptions/page', { params: data });
};

/**
 * 套餐详情
 */
export const detailPlanDefinitions = (data?: { id: number } | any) => {
  return request.get<any, PlanDefinitionDetailResp>('/plan-definitions/{id}/detail', { params: data });
};

/**
 * 分页查询
 */
export const pagePlanDefinitions = (data?: { req: PageRequest, code: string, name: string, status: boolean } | any) => {
  return request.get<any, IPagePlanDefinitionPageResp>('/plan-definitions/page', { params: data });
};

