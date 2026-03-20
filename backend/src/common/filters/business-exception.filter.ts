import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ResponseDto } from '../dto/response.dto';
import { ErrorCode, ErrorMessages } from '../constants/error-codes';

/**
 * 全局异常处理过滤器
 * 捕获所有异常并统一格式返回
 */
@Catch()
export class BusinessExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let code = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = ErrorMessages[ErrorCode.INTERNAL_SERVER_ERROR];
    let statusCode = 200;

    // 业务异常
    if (exception instanceof BusinessException) {
      code = exception.code;
      message = (exception.getResponse() as any).message;
    }
    // HTTP 异常（验证失败等）
    else if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      const exceptionMessage = (exceptionResponse as any).message;

      // 如果是数组（class-validator 的验证错误），处理成可读的格式
      if (Array.isArray(exceptionMessage)) {
        message = exceptionMessage[0];
      } else if (typeof exceptionMessage === 'string') {
        message = exceptionMessage;
      }

      // 根据异常类型映射业务代码
      statusCode = exception.getStatus();
      if (statusCode === 400) {
        code = ErrorCode.INVALID_PASSWORD; // 泛指输入验证错误
      }
    }
    // 其他未知异常
    else if (exception instanceof Error) {
      message = exception.message || ErrorMessages[ErrorCode.INTERNAL_SERVER_ERROR];
      this.logger.error(exception.stack);
    }

    // 统一响应格式
    const responseData = ResponseDto.fail(code, message);

    this.logger.warn(
      `[${request.method}] ${request.url} - Code: ${code}, Message: ${message}`,
    );

    response.status(statusCode).json(responseData);
  }
}
