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

export interface RangeQueryDto {
  /** 开始时间 */
  name?: string;
  /** 开始时间 */
  startDate?: string;
  /** 结束时间 */
  endDate?: string;
}

// ==========================================
// 2. 接口定义 (API Functions)
// ==========================================

/**
 * 🚀 上传文件 (FormData 格式)
 * * @param payload - 可以直接传入拼装好的 FormData，或者传入单个 File 对象
 * @param fileFieldName - 如果传入的是单个 File，后端接收文件的字段名是什么？（通常是 'file'）
 */
export const upload = (payload: FormData | File, fileFieldName: string = 'file') => {
  let formData: FormData;

  // 如果调用方直接传了一个 File 对象（比如 <input type="file" /> 里拿到的）
  // 我们就在这里贴心地帮他包装成 FormData
  if (payload instanceof File) {
    formData = new FormData();
    formData.append(fileFieldName, payload);
  } else {
    // 如果调用方已经自己拼好了 FormData（比如他还想传别的参数），直接用
    formData = payload;
  }

  return request.post<any, OssFile>('/oss/files/upload', formData, {
    // 强制声明这是一个文件上传请求，覆盖默认的 application/json
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteFile = (fileId: string) => {
  return request.delete(`/oss/files/${fileId}`)
}