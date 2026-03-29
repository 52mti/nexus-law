import request from '@/utils/request';

// ==========================================
// 1. 数据类型定义 (Interfaces)
// ==========================================

export interface Order {
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
  /** 会员类型 */
  membershipPlanId?: string;
  /** PayType */
  payType?: string;
  /** 订单金额 */
  amount?: number;
  /** 生效日期 */
  effectiveDate?: string;
  /** 失效日期 */
  expirationDate?: string;
  /** OrderStatus */
  status?: string;
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

export interface PayDto {
  /** 订单id */
  orderId?: string;
  /** PayType */
  payType?: string;
}

export interface ResultOrder {
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
  data?: Order;
}

export interface IPageOrder {
  size?: number;
  current?: number;
  records?: Order[];
  total?: number;
  pages?: number;
}

export interface ResultIPageOrder {
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
  data?: IPageOrder;
}

export interface ExcelWriteFile {
  fileName?: string;
  template?: string;
  excelType?: string;
  writerType?: string;
  inMemory?: boolean;
  head?: string[][];
  include?: string[];
  exclude?: string[];
  password?: string;
  sheetList?: SheetInfo[];
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
  data?: Record<string, string>;
}

export interface ResultListOrder {
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
  data?: Order[];
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

// ==========================================
// 2. 接口定义 (API Functions)
// ==========================================

/**
 * 保存或更新
 */
export const saveOrUpdate = (data?: Order) => {
  return request.post<any, ResultBoolean>('/order/saveOrUpdate', data);
};

/**
 * 支付
 */
export const pay = (data?: PayDto) => {
  return request.post<any, ResultOrder>('/order/pay', data);
};

/**
 * 原生分页查询
 */
export const pageOnly = (data?: Order) => {
  return request.post<any, IPageOrder>('/order/pageOnly', data);
};

/**
 * 分页查询
 */
export const pageList = (data?: Order) => {
  return request.post<any, ResultIPageOrder>('/order/pageList', data);
};

/**
 * 列表查询
 */
export const list = (data?: Order) => {
  return request.post<any, Order[]>('/order/list', data);
};

/**
 * getNamesByIdList_15
 */
export const getNamesByIdList = (data?: IdList) => {
  return request.post<any, ResultMapStringString>('/order/getNamesByIdList', data);
};

/**
 * getListByIdIn_15
 */
export const getListByIdIn = (data?: IdList) => {
  return request.post<any, ResultListOrder>('/order/getListByIdIn', data);
};

/**
 * getListByField_15
 */
export const getListByField = (data?: FieldNameAndValue) => {
  return request.post<any, ResultListOrder>('/order/getListByField', data);
};

/**
 * getIdByName_15
 */
export const getIdByName = (data?: Name) => {
  return request.post<any, ResultString>('/order/getIdByName', data);
};

/**
 * 获取详情
 */
export const getById = (data?: Id) => {
  return request.post<any, ResultOrder>('/order/getById', data);
};

/**
 * 删除
 */
export const deleteOrder = (data?: IdList) => {
  return request.post<any, ResultBoolean>('/order/delete', data);
};

/**
 * 下单
 */
export const add = (data?: Id) => {
  return request.post<any, ResultOrder>('/order/add', data);
};

