import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.service';
import { prepareProfileAvatar } from '../users/profile-avatar';
import { presentUser, UsersRepository, UserWithProfile } from '../users/users.repository';
import { LoginDto, RegisterDto } from './dto/credentials.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async register(dto: RegisterDto, file?: Express.Multer.File) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username;
    if (await this.users.findByEmail(email)) throw new ConflictException('Email is already registered.');
    if (await this.users.findByUsername(username)) throw new ConflictException('Username is already registered.');

    const avatar = prepareProfileAvatar(dto, file);
    const user = await this.users.createRegisteredUser({
      email,
      username,
      passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
      avatar: avatar?.metadata,
    });

    if (avatar?.file) {
      const imageId = user.profile?.profileImage?.id;
      if (!imageId) throw new Error('Profile image was not created.');
      const storageKey = `profile-images/${user.id}/${imageId}/original${avatar.file.extension}`;
      try {
        await this.users.updateProfileImageStorageKey(imageId, storageKey);
        await this.storage.save(storageKey, avatar.file.buffer);
      } catch (error) {
        await this.storage.deletePrefix(`profile-images/${user.id}`);
        await this.users.deleteRegisteredUser(user.id, imageId);
        throw error;
      }
    }
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email.trim().toLowerCase());
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.session(user);
  }

  private async session(user: UserWithProfile) {
    return {
      token: await this.jwt.signAsync({ sub: user.id, email: user.email }),
      user: presentUser(user),
    };
  }
}
