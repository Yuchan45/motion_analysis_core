import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class OriginValidationMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
    const origin = request.get('origin');
    if (!origin) return next();
    const allowed = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((value) => value.trim());
    if (!allowed.includes(origin)) throw new ForbiddenException('Origin is not allowed.');
    next();
  }
}
