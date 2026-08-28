import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const rawMessage = typeof body === 'string' ? body : (body as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage ?? 'Internal server error';
    const code = (typeof body === 'object' && body && 'code' in body && typeof body.code === 'string')
      ? body.code
      : HttpStatus[status] ?? 'ERROR';

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
