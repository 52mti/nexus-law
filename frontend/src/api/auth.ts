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
  /** 登录类型 (例如: slider) */
  loginType?: string;
  /** 验证码 */
  code?: string;
}

/** 注册请求参数 */
export interface RegisterReq {
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickName: string;
  /** 密码 */
  password: string;
  /** 邮箱 */
  email: string;
  /** 手机号 */
  mobile: string;
  /** 验证码 */
  code: string;
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
  username: string;
  password: string;
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

export interface GetVerificationCodeReq {
  /** 手机号 */
  mobile: string;
}

export interface CheckCodeReq {
  /** 手机号 */
  mobile: string;
  /** 验证码 */
  code: string;
}

// ==========================================
// 2. 接口定义 (API Functions)
// ==========================================

/**
 * 获取验证码
 * @param data 手机号
 * @returns 
 */
export const getVerificationCode = (data: GetVerificationCodeReq) => {
  return request.post<any, void>('/member/getCode', data);
};

/**
 * 校验验证码
 * @param data 手机号和验证码
 * @returns 
 */
export const checkCode = (data: CheckCodeReq) => {
  return request.post<any, void>('/member/validCode', data);
};

/**
 * 用户注册
 * @param data 注册参数
 * @returns 
 */
export const register = (data: RegisterReq) => {
  return request.post<any, RegisterReq>('/member/register', data);
};

/**
 * 用户登录
 * @param data 登录参数
 */
export const login = (data: LoginReq) => {
  // 注意：根据你的拦截器 <T> 返回值推断，可以直接指定泛型或者包裹在统一的 ApiResponse 中
  return request.post<any, LoginResp>('/member/login', data);
};

/**
 * 退出登录
 */
export const logout = () => {
  return request.delete<any, void>('/member/logout');
};

/**
 * 修改密码
 * @param data 用户名和密码
 */
export const changePassword = (data: ChangePasswordReq) => {
  return request.post<any, void>('/member/modifyPassword', data);
};

/**
 * 信息修改
 * @param data 用户信息
 */
export const changeInfo = (data: ChangeUserInfoReq) => {
  return request.put<any, void>('/member/change_info', data);
};

/**
 * 强退用户
 * @param token 要强退的访问令牌
 */
export const forceLogout = (token: string) => {
  return request.delete<any, void>(`/member/${token}`);
};

/**
 * 获取会员信息
 * 
 */
export const getMemberInfo = () => {
  return request.post<any, void>(`/member/getMemberInfo`);
};