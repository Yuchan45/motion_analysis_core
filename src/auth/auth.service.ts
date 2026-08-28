import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersRepository } from '../users/users.repository';
import { CredentialsDto } from './dto/credentials.dto';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersRepository, private readonly jwt: JwtService) {}

  async register(dto: CredentialsDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) throw new ConflictException('Email is already registered.');
    const user = await this.users.create(email, await argon2.hash(dto.password, { type: argon2.argon2id }));
    return this.session(user);
  }

  async login(dto: CredentialsDto) {
    const user = await this.users.findByEmail(dto.email.trim().toLowerCase());
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.session(user);
  }

  private async session(user: { id: string; email: string; createdAt: Date; updatedAt: Date }) {
    return {
      token: await this.jwt.signAsync({ sub: user.id, email: user.email }),
      user: { id: user.id, email: user.email, createdAt: user.createdAt, updatedAt: user.updatedAt },
    };
  }
}
