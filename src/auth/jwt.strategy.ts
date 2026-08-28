import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from '../users/users.repository';

const cookieExtractor = (request: Request): string | null => request?.cookies?.motion_access_token ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly users: UsersRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException();
    return { id: user.id, email: user.email };
  }
}
