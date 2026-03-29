import request from '@/utils/request';

// ==========================================
// 1. 数据类型定义 (Interfaces)
// ==========================================

export interface OssFile {
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
  /** 租户ID */
  tenantId?: number;
  /** 存储平台标识 */
  platform?: string;
  /** 文件分类 */
  category?: string;
  /** 原始文件名 */
  originalFilename?: string;
  /** 文件名称 */
  filename?: string;
  /** 文件访问地址 */
  url?: string;
  /** 文件大小，单位字节 */
  fileSize?: number;
  /** MIME类型 */
  contentType?: string;
  /** 文件扩展名 */
  ext?: string;
  /** 基础存储路径 */
  basePath?: string;
  /** 存储路径 */
  path?: string;
  /** 文件ACL (private/public-read) */
  fileAcl?: string;
  /** 缩略图访问路径 */
  thUrl?: string;
  /** 缩略图名称 */
  thFilename?: string;
  /** 缩略图大小，单位字节 */
  thSize?: number;
  /** 缩略图MIME类型 */
  thContentType?: string;
  /** 缩略图文件ACL */
  thFileAcl?: string;
  /** 文件所属对象id */
  objectId?: string;
  /** 文件所属对象类型 */
  objectType?: string;
  /** 哈希信息 */
  hashInfo?: string;
  /** 附加属性 */
  attr?: string;
  /** 文件元数据 */
  metadata?: string;
  /** 文件用户元数据 */
  userMetadata?: string;
  /** 缩略图元数据 */
  thMetadata?: string;
  /** 缩略图用户元数据 */
  thUserMetadata?: string;
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

export interface OssFilePreviewResp {
  /** 文件路径 */
  path?: string;
  /** 原始文件名称 */
  originalName?: string;
  /** 预览地址 */
  previewUrl?: string;
}

export interface IPageOssFile {
  size?: number;
  current?: number;
  records?: OssFile[];
  total?: number;
  pages?: number;
}

export interface ResultIPageOssFile {
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
  data?: IPageOssFile;
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

export interface ResultListOssFile {
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
  data?: OssFile[];
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

export interface ResultOssFile {
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
  data?: OssFile;
}

export interface IPageOssFilePageResp {
  size?: number;
  current?: number;
  records?: OssFilePageResp[];
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

export interface OssFilePageResp {
  /** 主键ID */
  id?: number;
  /** 租户ID */
  tenantId?: number;
  /** 存储平台标识 */
  platform?: string;
  /** 文件分类 */
  category?: string;
  /** 原始文件名 */
  originalFilename?: string;
  /** 当前文件名 */
  filename?: string;
  /** 文件扩展名 */
  ext?: string;
  /** MIME类型 */
  contentType?: string;
  /** 文件大小 (字节) */
  size?: number;
  /** 格式化后的文件大小 */
  formatSize?: string;
  /** 文件访问地址 */
  url?: string;
  /** 缩略图访问地址 */
  thUrl?: string;
  /** 缩略图大小 (字节) */
  thSize?: number;
  /** 基础存储路径 */
  basePath?: string;
  /** 存储路径 */
  path?: string;
  /** 上传人姓名 */
  createName?: string;
  /** 上传时间 */
  createTime?: string;
}

// ==========================================
// 2. 接口定义 (API Functions)
// ==========================================

/**
 * 重命名
 */
export const renameById = (id: string, data?: any) => {
  return request.put<any, any>(`/oss/files/${id}/name`, data);
};

/**
 * 上传文件
 */
export const upload = (data?: any) => {
  return request.post<any, OssFile>('/oss/files/upload', data);
};

/**
 * 上传文件
 */
export const uploadOSS = (data?: any) => {
  return request.post<any, OssFile>('/oss/files/uploadOSS', data);
};

/**
 * 上传图片
 */
export const image = (data?: any) => {
  return request.post<any, OssFile>('/oss/files/upload/image', data);
};

/**
 * 保存或更新
 */
export const saveOrUpdate = (data?: OssFile) => {
  return request.post<any, ResultBoolean>('/oss/files/saveOrUpdate', data);
};

/**
 * 批量预览
 */
export const batch = (data?: string[]) => {
  return request.post<any, string[]>('/oss/files/preview/batch', data);
};

/**
 * 批量预览(Map)
 */
export const batchMap = (data?: string[]) => {
  return request.post<any, Record<string, OssFilePreviewResp>>('/oss/files/preview/batch-map', data);
};

/**
 * 原生分页查询
 */
export const pageOnly = (data?: OssFile) => {
  return request.post<any, IPageOssFile>('/oss/files/pageOnly', data);
};

/**
 * 分页查询
 */
export const pageList = (data?: OssFile) => {
  return request.post<any, ResultIPageOssFile>('/oss/files/pageList', data);
};

/**
 * 列表查询
 */
export const list = (data?: OssFile) => {
  return request.post<any, OssFile[]>('/oss/files/list', data);
};

/**
 * 导入Excel
 */
export const importExcel = (data?: any) => {
  return request.post<any, ExcelWriteFile>('/oss/files/importExcel', data);
};

/**
 * getNamesByIdList_12
 */
export const getNamesByIdList = (data?: IdList) => {
  return request.post<any, ResultMapStringString>('/oss/files/getNamesByIdList', data);
};

/**
 * getListByIdIn_12
 */
export const getListByIdIn = (data?: IdList) => {
  return request.post<any, ResultListOssFile>('/oss/files/getListByIdIn', data);
};

/**
 * getListByField_12
 */
export const getListByField = (data?: FieldNameAndValue) => {
  return request.post<any, ResultListOssFile>('/oss/files/getListByField', data);
};

/**
 * getIdByName_12
 */
export const getIdByName = (data?: Name) => {
  return request.post<any, ResultString>('/oss/files/getIdByName', data);
};

/**
 * 获取详情
 */
export const getById = (data?: Id) => {
  return request.post<any, ResultOssFile>('/oss/files/getById', data);
};

/**
 * 导出Excel
 */
export const exportExcel = (data?: OssFile) => {
  return request.post<any, ExcelWriteFile>('/oss/files/exportExcel', data);
};

/**
 * 删除
 */
export const deleteFile = (data?: IdList) => {
  return request.post<any, ResultBoolean>('/oss/files/delete', data);
};

/**
 * 分页查询
 */
export const files = (data?: any) => {
  return request.get<any, IPageOssFilePageResp>('/oss/files', { params: data });
};

/**
 * 文件预览
 */
export const preview = (data?: any) => {
  return request.get<any, any>('/oss/files/preview', { params: data });
};

/**
 * 删除文件
 */
export const deleteById = (id: string, data?: any) => {
  return request.delete<any, any>(`/oss/files/${id}`, { params: data });
};

