import request from '@/utils/request';

// ==========================================
// 1. 数据类型定义 (Interfaces)
// ==========================================

/** 登录请求参数 */
export interface LoginReq {
  /** 账号 */
  username: string;
  /** 密码 */
  password: string;
  /** 授权类型 (例如: password) */
  grantType?: string;
  /** 客户端ID (例如: pc-web) */
  clientId?: string;
  /** 客户端密钥 */
  clientSecret?: string;
}

/** 登录响应结果 */
export interface LoginResp {
  /** 访问令牌 */
  accessToken?: string;
  /** Token 类型 */
  tokenType?: string;
  /** 刷新令牌 */
  refreshToken?: string;
  /** 客户端ID */
  clientId?: string;
  /** 访问令牌失效时间 */
  expiresIn?: number;
  /** 刷新令牌失效时间 */
  refreshExpireIn?: number;
  /** scope */
  scope?: string[];
  /** openId */
  openId?: string;
}

/** 修改密码请求参数 */
export interface ChangePasswordReq {
  /** 旧密码 */
  currentPassword: string;
  /** 新密码 */
  newPassword: string;
  /** 确认密码 */
  confirmPassword: string;
}

/** 修改用户基本信息请求参数 */
export interface ChangeUserInfoReq {
  /** 邮箱 */
  email: string;
  /** 昵称 */
  nickName: string;
  /** 手机号 */
  mobile: string;
  /** 生日 */
  birthday?: string;
  /** 描述 */
  description?: string;
}

// ==========================================
// 2. 接口定义 (API Functions)
// ==========================================

/**
 * 用户登录
 * @param data 登录参数
 */
export const login = (data: LoginReq) => {
  // 注意：根据你的拦截器 <T> 返回值推断，可以直接指定泛型或者包裹在统一的 ApiResponse 中
  return request.post<any, LoginResp>('/token/login', data);
};

/**
 * 退出登录
 */
export const logout = () => {
  return request.delete<any, void>('/token/logout');
};

/**
 * 修改密码
 * @param data 密码信息
 */
export const changePassword = (data: ChangePasswordReq) => {
  return request.put<any, void>('/token/change_password', data);
};

/**
 * 信息修改
 * @param data 用户信息
 */
export const changeInfo = (data: ChangeUserInfoReq) => {
  return request.put<any, void>('/token/change_info', data);
};

/**
 * 强退用户
 * @param token 要强退的访问令牌
 */
export const forceLogout = (token: string) => {
  return request.delete<any, void>(`/token/${token}`);
};