import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException, UnsupportedMediaTypeException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { ProfileImageSourceType } from '@prisma/client';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.service';
import { presentUser, RegistrationAvatar, UsersRepository, UserWithProfile } from '../users/users.repository';
import { LoginDto, RegisterDto } from './dto/credentials.dto';

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const DICEBEAR_STYLES = new Set(['waves', 'stack', 'stripes', 'initial-face', 'patchwork']);

type DetectedImage = { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; extension: '.jpg' | '.png' | '.webp' };

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

    const avatar = this.createAvatar(dto, file);
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

  private createAvatar(dto: RegisterDto, file?: Express.Multer.File): { metadata: RegistrationAvatar; file?: DetectedImage & { buffer: Buffer } } | undefined {
    if (dto.avatarSource === 'none') {
      if (file || dto.diceBearStyle || dto.diceBearSeed) throw new BadRequestException('Avatar source fields are inconsistent.');
      return undefined;
    }
    if (dto.avatarSource === 'generated') {
      if (file || !dto.diceBearStyle || !dto.diceBearSeed || !DICEBEAR_STYLES.has(dto.diceBearStyle)) {
        throw new BadRequestException('Invalid DiceBear avatar selection.');
      }
      return {
        metadata: {
          sourceType: ProfileImageSourceType.GENERATED,
          provider: 'dicebear',
          url: `https://api.dicebear.com/10.x/${dto.diceBearStyle}/svg?seed=${encodeURIComponent(dto.diceBearSeed)}`,
        },
      };
    }
    if (dto.avatarSource !== 'upload' || !file) throw new BadRequestException('A profile image is required.');
    if (dto.diceBearStyle || dto.diceBearSeed) throw new BadRequestException('Avatar source fields are inconsistent.');
    if (file.size > MAX_PROFILE_IMAGE_BYTES) throw new BadRequestException('Profile image must not exceed 5 MB.');
    const detected = this.detectImage(file.buffer);
    if (!detected) throw new UnsupportedMediaTypeException('Profile image must be a JPEG, PNG, or WebP file.');
    return {
      metadata: { sourceType: ProfileImageSourceType.MANAGED, mimeType: detected.mimeType, sizeBytes: file.size },
      file: { ...detected, buffer: file.buffer },
    };
  }

  private detectImage(buffer: Buffer): DetectedImage | null {
    if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { mimeType: 'image/jpeg', extension: '.jpg' };
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mimeType: 'image/png', extension: '.png' };
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { mimeType: 'image/webp', extension: '.webp' };
    return null;
  }

  private async session(user: UserWithProfile) {
    return {
      token: await this.jwt.signAsync({ sub: user.id, email: user.email }),
      user: presentUser(user),
    };
  }
}
