import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessages } from '../constants/error-codes';

/**
 * 业务异常
 * 用于抛出带有业务状态码的异常
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
  ) {
    // 永远返回 HTTP 200，业务逻辑通过 code 字段区分
    super(
      {
        code,
        message: message || ErrorMessages[code],
      },
      HttpStatus.OK,
    );
  }
}
