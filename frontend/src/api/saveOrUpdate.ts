import request from '@/utils/request';

/** User 表单数据 (由脚本抽取) */
export interface User {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  username?: string; // 用户名
  tenantId?: string; // 租户ID
  password?: string; // 密码
  nickName?: string; // 昵称
  description?: string; // 描述
  idCard?: string; // 身份证
  email?: string; // 邮箱
  mobile?: string; // 手机号
  sex?: string; // 枚举
  avatar?: string; // 头像
  readonly?: boolean; // 是否只读
  status?: boolean; // 状态(false=禁用;true=启用)
  nation?: string; // 民族
  education?: string; // 学历
  birthday?: string; // 生日
  orgId?: string; // 机构ID
  positionId?: string; // 岗位ID
  positionStatus?: string; // 职位状态
  lastLoginIp?: string; // 最后登录IP
  lastLoginTime?: string; // 最后登录时间
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateUsers = (data: User) => {
  return request.post<any, any>('/users/saveOrUpdate', data);
};

/** Tenant 表单数据 (由脚本抽取) */
export interface Tenant {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  code?: string; // 编码
  name?: string; // 名称
  type?: number; // 类型
  status?: boolean; // 状态;0=未启用;1=启用
  alias?: string; // 别名
  logo?: string; // LOGO
  email?: string; // 邮箱
  contactPerson?: string; // 联系人
  contactPhone?: string; // 联系方式
  industry?: string; // 行业
  provinceId?: number; // 省
  provinceName?: string; // 省
  cityId?: number; // 市
  cityName?: string; // 市
  districtId?: number; // 区
  districtName?: string; // 区
  address?: string;
  creditCode?: string; // 统一信用代码
  legalPersonName?: string; // 法人
  webSite?: string; // WEB站点
  description?: string; // 描述
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateTenants = (data: Tenant) => {
  return request.post<any, any>('/tenants/saveOrUpdate', data);
};

/** TenantDict 表单数据 (由脚本抽取) */
export interface TenantDict {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  code?: string; // 编码
  name?: string; // 名称
  parentId?: number; // 父级节点ID
  parentCode?: string; // 父级节点编码
  fullCodePath?: string; // 完整字典路径
  sequence?: number; // 排序
  tenantId?: string; // 租户ID
  readonly?: boolean; // 是否只读
  description?: string; // 描述
  status?: boolean; // 状态
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateTenantDict = (data: TenantDict) => {
  return request.post<any, any>('/tenant-dict/saveOrUpdate', data);
};

/** Settings 表单数据 (由脚本抽取) */
export interface Settings {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  name?: string; // 名称
  code?: string; // 编码
  type?: number; // 类型：0文本，1数值，2颜色，3图片
  value?: string; // 值
  remarks?: string; // 备注
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateSettings = (data: Settings) => {
  return request.post<any, any>('/settings/saveOrUpdate', data);
};

/** Role 表单数据 (由脚本抽取) */
export interface Role {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  tenantId?: number; // 租户ID
  name?: string; // 角色名称
  code?: string; // 角色编码
  superRole?: boolean; // 超级角色
  description?: string; // 租户描述
  readonly?: boolean; // 是否只读
  status?: boolean; // 状态(true=启用;false=禁用)
  scopeType?: string; // 权限类型
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateRoles = (data: Role) => {
  return request.post<any, any>('/roles/saveOrUpdate', data);
};

/** Resource 表单数据 (由脚本抽取) */
export interface Resource {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  clientId?: string; // 归属应用
  permission?: string; // 权限编码
  title?: string; // 名称
  parentId?: number; // 父级菜单ID
  type?: string; // 资源类型-枚举
  sequence?: number; // 排序
  icon?: string; // 图标
  path?: string; // 路径
  component?: string; // 组件
  keepAlive?: boolean; // 页面缓存，开启后页面会缓存，不会重新加载，仅在标签页启用时有效
  shared?: boolean; // 公共资源（无需分配所有人可访问）
  visible?: boolean; // 是否可见
  status?: boolean; // 状态
  description?: string; // 描述
  meta?: any; // 路由元信息(JSON)
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateResources = (data: Resource) => {
  return request.post<any, any>('/resources/saveOrUpdate', data);
};

/** Request 表单数据 (由脚本抽取) */
export interface Request {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  requestContent?: string; // 请求内容
  responseContent?: string; // 响应内容
  billNo?: string; // 单据编码
  taskNo?: string; // 任务编号
  status?: string; // 枚举
  remarks?: string; // 任务重发
  type?: string; // 枚举
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateRequest = (data: Request) => {
  return request.post<any, any>('/request/saveOrUpdate', data);
};

/** RegisteredClient 表单数据 (由脚本抽取) */
export interface RegisteredClient {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  clientId?: string; // 客户端ID
  clientSecret?: string; // 客户端秘钥
  clientIdIssuedAt?: string; // 客户端 ID 发放时间
  clientSecretExpiresAt?: string; // 客户端 秘钥失效时间
  clientName?: string; // 客户端名称
  grantTypes?: string; // 授权类型
  redirectUris?: string; // 重定向地址
  postLogoutRedirectUris?: string; // 退出登录重定向地址
  scopes?: string; // 授权范围
  clientSettings?: string; // 客户端设置
  tokenSettings?: string; // 令牌设置
  status?: boolean; // 状态
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateRegisteredClient = (data: RegisteredClient) => {
  return request.post<any, any>('/registered-client/saveOrUpdate', data);
};

/** Position 表单数据 (由脚本抽取) */
export interface Position {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  code?: string; // 编码
  title?: string; // 标题
  sequence?: number; // 排序
  orgId?: number; // 组织ID
  status?: boolean; // 状态
  description?: string; // 描述
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdatePositions = (data: Position) => {
  return request.post<any, any>('/positions/saveOrUpdate', data);
};

/** Points 表单数据 (由脚本抽取) */
export interface Points {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  taskType?: string; // AgvResult
  taskCount?: number; // 任务量
  startWorkstationId?: string; // 开始工位
  endWorkstationId?: string; // 结束工位
  outWorkstationId?: string; // 出库工位
  liftTask?: string; // 枚举
  busyStatus?: string; // BusyStatus
  businessType?: string; // BusinessType
  status?: string; // 枚举
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdatePoints = (data: Points) => {
  return request.post<any, any>('/points/saveOrUpdate', data);
};

/** PlanSubscription 表单数据 (由脚本抽取) */
export interface PlanSubscription {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  planId?: number; // 套餐ID
  tenantId?: number; // 租户ID
  userNum?: number; // 用户数量
  monthNum?: number; // 月数
  licensePrice?: number; // 用户单价
  totalAmount?: number; // 总金额
  discountAmount?: number; // 优惠金额
  statementPrice?: number; // 结算单价
  statementAmount?: number; // 结算金额
  startTime?: string; // 开始时间
  endTime?: string; // 结束时间
  paymentStatus?: string; // 支付状态(0=待支付;10=部分支付;20=已支付)
  description?: string; // 描述信息
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdatePlanSubscriptions = (data: PlanSubscription) => {
  return request.post<any, any>('/plan-subscriptions/saveOrUpdate', data);
};

/** PlanDefinition 表单数据 (由脚本抽取) */
export interface PlanDefinition {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  name?: string; // 套餐名称
  code?: string; // 套餐编码
  logo?: string; // 套餐Logo链接
  description?: string; // 套餐详情
  status?: boolean; // 启用状态
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdatePlanDefinitions = (data: PlanDefinition) => {
  return request.post<any, any>('/plan-definitions/saveOrUpdate', data);
};

/** OssFile 表单数据 (由脚本抽取) */
export interface OssFile {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  tenantId?: number; // 租户ID
  platform?: string; // 存储平台标识
  category?: string; // 文件分类
  originalFilename?: string; // 原始文件名
  filename?: string; // 文件名称
  url?: string; // 文件访问地址
  fileSize?: number; // 文件大小，单位字节
  contentType?: string; // MIME类型
  ext?: string; // 文件扩展名
  basePath?: string; // 基础存储路径
  path?: string; // 存储路径
  fileAcl?: string; // 文件ACL (private/public-read)
  thUrl?: string; // 缩略图访问路径
  thFilename?: string; // 缩略图名称
  thSize?: number; // 缩略图大小，单位字节
  thContentType?: string; // 缩略图MIME类型
  thFileAcl?: string; // 缩略图文件ACL
  objectId?: string; // 文件所属对象id
  objectType?: string; // 文件所属对象类型
  hashInfo?: string; // 哈希信息
  attr?: string; // 附加属性
  metadata?: string; // 文件元数据
  userMetadata?: string; // 文件用户元数据
  thMetadata?: string; // 缩略图元数据
  thUserMetadata?: string; // 缩略图用户元数据
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateFiles = (data: OssFile) => {
  return request.post<any, any>('/oss/files/saveOrUpdate', data);
};

/** OssConfig 表单数据 (由脚本抽取) */
export interface OssConfig {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  tenantId?: string; // 租户ID
  type?: string; // 存储类型 (MINIO, ALIYUN, TENCENT, QINIU, S3)
  platform?: string; // 配置编码 (唯一标识, 如: minio_local)
  accessKey?: string; // AccessKey
  secretKey?: string; // SecretKey
  bucketName?: string; // 存储桶名称
  endPoint?: string; // 连接端点 (Endpoint)
  region?: string; // 存储区域 (Region)
  domain?: string; // 访问域名 (CDN/自定义域名)
  basePath?: string; // 基础路径/前缀
  status?: boolean; // 状态
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateConfigs = (data: OssConfig) => {
  return request.post<any, any>('/oss/configs/saveOrUpdate', data);
};

/** Org 表单数据 (由脚本抽取) */
export interface Org {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  label?: string; // 标题
  treePath?: any[]; // 树形结构路径
  parentId?: string; // 父ID
  sequence?: number; // 排序号
  tel?: string; // 电话
  tenantId?: string; // 租户ID
  alias?: string; // 简称
  status?: boolean; // 状态
  description?: string; // 描述
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateOrg = (data: Org) => {
  return request.post<any, any>('/org/saveOrUpdate', data);
};

/** Order 表单数据 (由脚本抽取) */
export interface Order {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  code?: string; // 承运商编码
  name?: string; // 承运商名称
  type?: string; // CarrierType
  serviceType?: string; // ServiceType
  effectiveDate?: string; // 生效日期
  expirationDate?: string; // 失效日期
  paymentTerm?: string; // 付款条款
  settlementType?: string; // 结算类型
  postcode?: string; // 邮编
  contactName?: string; // 联系人
  mobile?: string; // 手机号
  email?: string; // 电子邮箱
  fax?: string; // 传真
  provinceId?: string; // 省
  provinceName?: string; // 省
  cityId?: string; // 市
  cityName?: string; // 市
  districtId?: string; // 区
  districtName?: string; // 区
  address?: string; // 详细地址
  description?: string; // 备注
  status?: string; // 状态
  attachment?: string; // 附件
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateOrder = (data: Order) => {
  return request.post<any, any>('/order/saveOrUpdate', data);
};

/** OptLog 表单数据 (由脚本抽取) */
export interface OptLog {
  id?: string; // ID
  createBy?: string; // 创建者ID
  createName?: string; // 创建者名字
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  tenantId?: string; // 租户ID
  tenantCode?: string; // 租户编码
  ip?: string; // 操作IP
  location?: string; // 地区信息
  trace?: string; // 日志链路追踪id日志标志
  module?: string; // 操作模块
  description?: string; // 操作描述
  action?: string; // 请求方法
  uri?: string; // 请求地址
  httpMethod?: string; // HTTP Method
  request?: string; // 请求参数
  response?: string; // 返回值
  message?: string; // 异常描述
  status?: boolean; // 日志状态(true:正常;false:异常)
  startTime?: string; // 开始时间
  endTime?: string; // 结束时间
  duration?: number; // 消耗时间
  browser?: string; // 浏览器信息
  engine?: string; // 浏览器引擎
  os?: string; // 操作系统
  platform?: string; // 平台
  token?: string; // 请求令牌
  test?: string;
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateOptLogs = (data: OptLog) => {
  return request.post<any, any>('/opt-logs/saveOrUpdate', data);
};

/** OnlineModel 表单数据 (由脚本抽取) */
export interface OnlineModel {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  title?: string; // 标题
  definitionKey?: string; // 定义KEY
  status?: boolean; // 状态
  version?: number; // 版本号
  description?: string; // 备注
  formScript?: string;
  formSchemas?: string; // 表单配置
  formCrudConfig?: string; // 表单crud配置
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateOnlineModel = (data: OnlineModel) => {
  return request.post<any, any>('/online-model/saveOrUpdate', data);
};

/** OnlineFormData 表单数据 (由脚本抽取) */
export interface OnlineFormData {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  definitionKey?: string;
  formData?: any;
  tenantId?: string;
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateOnlineFormData = (data: OnlineFormData) => {
  return request.post<any, any>('/online-form-data/saveOrUpdate', data);
};

/** MessageTemplate 表单数据 (由脚本抽取) */
export interface MessageTemplate {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  code?: string; // 模板编码
  name?: string; // 模板名称
  type?: string; // 类型
  subject?: string; // 消息标题（如邮件标题）
  content?: string; // 消息内容模板，支持占位符
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateMessageTemplate = (data: MessageTemplate) => {
  return request.post<any, any>('/message-template/saveOrUpdate', data);
};

/** MessageNotify 表单数据 (由脚本抽取) */
export interface MessageNotify {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  title?: string; // 标题
  type?: string; // 消息类型
  templateId?: string; // 消息模板ID
  variables?: string; // 消息变量
  content?: string; // 内容
  subscribe?: string; // 订阅人 比如 邮箱,手机号,钉钉ID等
  userId?: string; // 接收用户ID
  nickname?: string; // 用户昵称
  tenantId?: string; // 租户ID
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateMessageNotify = (data: MessageNotify) => {
  return request.post<any, any>('/message-notify/saveOrUpdate', data);
};

/** MessageChannel 表单数据 (由脚本抽取) */
export interface MessageChannel {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  title?: string; // 标题
  type?: string; // 类型
  status?: boolean; // 状态(0=禁用;1=启用)
  setting?: string; // 设置
  tenantId?: number; // 租户ID
  description?: string; // 描述信息
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateMessageChannel = (data: MessageChannel) => {
  return request.post<any, any>('/message-channel/saveOrUpdate', data);
};

/** MembershipPlan 表单数据 (由脚本抽取) */
export interface MembershipPlan {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  code?: string; // 承运商编码
  name?: string; // 承运商名称
  type?: string; // CarrierType
  serviceType?: string; // ServiceType
  effectiveDate?: string; // 生效日期
  expirationDate?: string; // 失效日期
  paymentTerm?: string; // 付款条款
  settlementType?: string; // 结算类型
  postcode?: string; // 邮编
  contactName?: string; // 联系人
  mobile?: string; // 手机号
  email?: string; // 电子邮箱
  fax?: string; // 传真
  provinceId?: string; // 省
  provinceName?: string; // 省
  cityId?: string; // 市
  cityName?: string; // 市
  districtId?: string; // 区
  districtName?: string; // 区
  address?: string; // 详细地址
  description?: string; // 备注
  status?: string; // 状态
  attachment?: string; // 附件
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateMembershipPlan = (data: MembershipPlan) => {
  return request.post<any, any>('/membershipPlan/saveOrUpdate', data);
};

/** Member 表单数据 (由脚本抽取) */
export interface Member {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  code?: string; // 客户编码
  name?: string; // 客户名称
  contactName?: string; // 联系人姓名
  contactPhone?: string; // 联系电话
  email?: string; // 电子邮件
  address?: string; // 地址
  tel?: string; // 公司电话
  establishmentDate?: string; // 成立日期
  businessStartDate?: string; // 营业期限开始时间
  businessEndDate?: string; // 营业期限截止时间
  provinceId?: string; // 省ID
  provinceName?: string; // 省名称
  cityId?: string; // 市ID
  cityName?: string; // 市名称
  districtId?: string; // 区ID
  districtName?: string; // 区名称
  registrationAuthority?: string; // 登记机关
  registrationAddress?: string; // 注册地址
  businessScope?: string; // 经营范围
  enterpriseType?: string; // 企业类型
  legalPerson?: string; // 法定代表人
  logo?: string; // LOGO（存储路径或URL）
  creditCode?: string; // 统一信用代码
  creditLimit?: number; // 信用限额
  description?: string; // 描述/备注
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateMember = (data: Member) => {
  return request.post<any, any>('/member/saveOrUpdate', data);
};

/** LoginLog 表单数据 (由脚本抽取) */
export interface LoginLog {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  ip?: string; // 登录IP
  tenantId?: string; // 租户ID
  tenantCode?: string; // 租户编码
  principal?: string; // 登录人账号
  platform?: string; // 平台类型
  engine?: string; // 引擎类型
  browser?: string; // 浏览器名称
  os?: string; // 操作系统
  location?: string; // 登录地点
  clientId?: string; // 客户端ID
  loginType?: string; // 登录类型
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateLoginLogs = (data: LoginLog) => {
  return request.post<any, any>('/login_logs/saveOrUpdate', data);
};

/** LegalProvisionsType 表单数据 (由脚本抽取) */
export interface LegalProvisionsType {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  code?: string; // 编码
  name?: string; // 名称
  status?: string; // 资源类型-枚举
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateLegalProvisionsType = (data: LegalProvisionsType) => {
  return request.post<any, any>('/legalProvisionsType/saveOrUpdate', data);
};

/** LegalProvisionsSession 表单数据 (由脚本抽取) */
export interface LegalProvisionsSession {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  legalProvisionsId?: string; // 条文id
  content?: string; // 搜索结果
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateLegalProvisionsSession = (data: LegalProvisionsSession) => {
  return request.post<any, any>('/legalProvisionsSession/saveOrUpdate', data);
};

/** LegalProvisions 表单数据 (由脚本抽取) */
export interface LegalProvisions {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  typeId?: string; // 类型
  code?: string; // 条文编号
  content?: string; // 模糊搜索
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateLegalProvisions = (data: LegalProvisions) => {
  return request.post<any, any>('/legalProvisions/saveOrUpdate', data);
};

/** I18nData 表单数据 (由脚本抽取) */
export interface I18nData {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  code?: string; // 编码
  remark?: string; // 备注
  tenantId?: string; // 租户ID
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateI18n = (data: I18nData) => {
  return request.post<any, any>('/i18n/saveOrUpdate', data);
};

/** GenerateTemplate 表单数据 (由脚本抽取) */
export interface GenerateTemplate {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  name?: string;
  generatePath?: string; // 模板路径
  description?: string; // 模板描述
  code?: string; // 模板代码
  tenantId?: string; // 租户ID
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateGenerateTemplate = (data: GenerateTemplate) => {
  return request.post<any, any>('/generate-template/saveOrUpdate', data);
};

/** GenerateTemplateGroup 表单数据 (由脚本抽取) */
export interface GenerateTemplateGroup {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  name?: string; // 分组名称
  description?: string; // 分组描述
  isDefault?: boolean; // 是否作为默认分组
  tenantId?: string; // 租户ID
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateGenerateTemplateGroup = (data: GenerateTemplateGroup) => {
  return request.post<any, any>('/generate-template-group/saveOrUpdate', data);
};

/** GenerateTable 表单数据 (由脚本抽取) */
export interface GenerateTable {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  name?: string; // 表名称
  comment?: string; // 表描述
  className?: string; // 实体类名
  packageName?: string; // 包名
  moduleName?: string; // 模块名
  columns?: any[];
  author?: string; // 作者
  email?: string; // 邮箱
  businessName?: string; // 业务名称
  removePrefix?: boolean; // 是否去掉前缀
  prefix?: string; // 前缀
  swagger?: boolean; // 是否开启swagger配置
  templateGroupId?: string; // 关联模板组
  tenantId?: string; // 租户ID
  backendPath?: string; // 后端路径
  frontPath?: string; // 前端路径
  firstMenuName?: string; // 首菜单名称
  clientId?: string; // 平台Id
  meta?: string; // 菜单元数据
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateGenerateTable = (data: GenerateTable) => {
  return request.post<any, any>('/generate-table/saveOrUpdate', data);
};

/** GenerateTableColumn 表单数据 (由脚本抽取) */
export interface GenerateTableColumn {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  tableName?: string;
  name?: string;
  sort?: number;
  type?: string;
  comment?: string;
  propertyType?: string;
  propertyName?: string;
  propertyPackage?: string;
  pk?: boolean;
  increment?: boolean;
  required?: boolean;
  inserted?: boolean;
  edit?: boolean;
  list?: boolean;
  search?: boolean;
  searchCondition?: string;
  generate?: boolean;
  tenantId?: string; // 租户ID
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateGenerateTableColumn = (data: GenerateTableColumn) => {
  return request.post<any, any>('/generate-table-column/saveOrUpdate', data);
};

/** SysDict 表单数据 (由脚本抽取) */
export interface SysDict {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  name?: string; // 名称
  code?: string; // 编码
  parentId?: string; // 父级节点ID
  parentCode?: string; // 父级节点编码
  fullCodePath?: string; // 完整字典路径
  type?: number; // 字典类型 0=平台字典;1=租户字典
  sequence?: number; // 排序
  status?: boolean; // 状态
  description?: string; // 描述
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateDict = (data: SysDict) => {
  return request.post<any, any>('/dict/saveOrUpdate', data);
};

/** DbInstance 表单数据 (由脚本抽取) */
export interface DbInstance {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  name?: string; // 节点名称
  dbType?: string; // 数据库类型
  driverClassName?: string; // 驱动类名
  jdbcUrl?: string; // JDBC连接串
  username?: string; // 用户名
  password?: string; // 密码
  status?: boolean; // 是否启用(0=停用；1=启用)
  description?: string; // 描述
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateDbInstances = (data: DbInstance) => {
  return request.post<any, any>('/db-instances/saveOrUpdate', data);
};

/** DataPermissionRef 表单数据 (由脚本抽取) */
export interface DataPermissionRef {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  ownerId?: string; // 所有者ID（角色ID/用户ID等）
  ownerType?: string; // 所有者类型（ROLE-角色, USER-用户等）
  dataType?: string; // 数据类型（ORG-机构, COMPANY-公司等）
  scopeType?: number; // 权限范围类型: 10-个人, 20-自定义, 30-本级, 40-本级及子级, 50-全部
  dataId?: string; // 数据ID（自定义时的具体数据，非自定义时为null）
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateDataPermissions = (data: DataPermissionRef) => {
  return request.post<any, any>('/data-permissions/saveOrUpdate', data);
};

/** ComplianceReviewSession 表单数据 (由脚本抽取) */
export interface ComplianceReviewSession {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  complianceReviewId?: string; // 合规审查id
  content?: string; // 搜索结果
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateComplianceReviewSession = (data: ComplianceReviewSession) => {
  return request.post<any, any>('/complianceReviewSession/saveOrUpdate', data);
};

/** ComplianceReview 表单数据 (由脚本抽取) */
export interface ComplianceReview {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  attachments?: string; // 附件
  angleId?: string; // 角度
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateComplianceReview = (data: ComplianceReview) => {
  return request.post<any, any>('/complianceReview/saveOrUpdate', data);
};

/** CaseType 表单数据 (由脚本抽取) */
export interface CaseType {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  code?: string; // 编码
  name?: string; // 名称
  status?: string; // 资源类型-枚举
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateCaseType = (data: CaseType) => {
  return request.post<any, any>('/caseType/saveOrUpdate', data);
};

/** CaseSession 表单数据 (由脚本抽取) */
export interface CaseSession {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  caseId?: string; // 案例
  content?: string; // 案例内容
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateCaseSession = (data: CaseSession) => {
  return request.post<any, any>('/caseSession/saveOrUpdate', data);
};

/** CaseExpressFlowSession 表单数据 (由脚本抽取) */
export interface CaseExpressFlowSession {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  caseExpressFlowId?: string; // 快流id
  content?: string; // 搜索结果
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateCaseExpressFlowSession = (data: CaseExpressFlowSession) => {
  return request.post<any, any>('/caseExpressFlowSession/saveOrUpdate', data);
};

/** CaseExpressFlow 表单数据 (由脚本抽取) */
export interface CaseExpressFlow {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  attachments?: string; // 附件
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateCaseExpressFlow = (data: CaseExpressFlow) => {
  return request.post<any, any>('/caseExpressFlow/saveOrUpdate', data);
};

/** Case 表单数据 (由脚本抽取) */
export interface Case {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  typeId?: string; // 类型
  keyword?: string; // 关键词
  startTime?: string; // 判决开始时间
  finishTime?: string; // 判决结束时间
  amountId?: string; // 涉案金额
  courtId?: string; // 涉案金额
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateCase = (data: Case) => {
  return request.post<any, any>('/case/saveOrUpdate', data);
};

/** AreaEntity 表单数据 (由脚本抽取) */
export interface AreaEntity {
  id?: string; // ID
  createBy?: string; // 创建人ID
  createName?: string; // 创建人名称
  createTime?: string; // 创建时间
  head?: any[];
  include?: any[];
  lastModifyBy?: string; // 最后修改人ID
  lastModifyName?: string; // 最后修改人名称
  deleted?: boolean; // 逻辑删除
  current?: number; // 当前页码
  size?: number; // 分页大小
  rangeQueryDtoList?: any[];
  editFieldList?: any[];
  name?: string; // 名称
  level?: number; // 层级
  parentId?: string; // 父ID
  longitude?: number; // 经度
  latitude?: number; // 纬度
  sequence?: number; // 排序
  source?: string; // 来源
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateAreas = (data: AreaEntity) => {
  return request.post<any, any>('/areas/saveOrUpdate', data);
};

