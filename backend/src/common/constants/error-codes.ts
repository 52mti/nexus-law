/**
 * 业务状态码枚举
 * 所有 API 响应都使用这些代码来表示业务逻辑的成功或失败
 */
export enum ErrorCode {
  // 成功
  SUCCESS = 0,

  // 验证/格式错误 (1xxx)
  INVALID_EMAIL = 1001,
  INVALID_PHONE = 1002,
  INVALID_PASSWORD = 1003,
  INVALID_VERIFICATION_CODE = 1004,
  VERIFICATION_CODE_EXPIRED = 1005,

  // 用户相关 (2xxx)
  EMAIL_ALREADY_REGISTERED = 2001,
  PHONE_ALREADY_REGISTERED = 2002,
  USER_NOT_FOUND = 2003,
  INVALID_CREDENTIALS = 2004,

  // 系统错误 (5xxx)
  INTERNAL_SERVER_ERROR = 5000,
}

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: 'Success',

  [ErrorCode.INVALID_EMAIL]: 'Invalid email format',
  [ErrorCode.INVALID_PHONE]: 'Invalid phone number',
  [ErrorCode.INVALID_PASSWORD]: 'Password must be at least 6 characters',
  [ErrorCode.INVALID_VERIFICATION_CODE]: 'Invalid verification code',
  [ErrorCode.VERIFICATION_CODE_EXPIRED]: 'Verification code has expired',

  [ErrorCode.EMAIL_ALREADY_REGISTERED]: 'Email already registered',
  [ErrorCode.PHONE_ALREADY_REGISTERED]: 'Phone number already registered',
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',

  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
};
