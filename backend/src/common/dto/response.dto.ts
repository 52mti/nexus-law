import { ErrorCode } from '../constants/error-codes';

/**
 * 统一响应格式
 * 所有 API 响应都使用这个格式，HTTP 状态码固定为 200
 */
export class ResponseDto<T = any> {
  code: ErrorCode;
  message: string;
  data?: T;

  constructor(code: ErrorCode, message: string, data?: T) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  /**
   * 成功响应
   */
  static success<T>(data: T, message = 'Success'): ResponseDto<T> {
    return new ResponseDto(ErrorCode.SUCCESS, message, data);
  }

  /**
   * 失败响应
   */
  static fail(code: ErrorCode, message: string): ResponseDto {
    return new ResponseDto(code, message);
  }
}
