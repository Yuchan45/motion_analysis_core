import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.service';
import { presentUser, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async getPublicUser(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('User not found.');
    return presentUser(user);
  }

  async getOwnProfileImage(imageId: string, userId: string) {
    const profile = await this.users.findProfileImageForUser(imageId, userId);
    if (!profile?.profileImage?.storageKey || !profile.profileImage.mimeType) throw new NotFoundException('Profile image not found.');
    return this.storage.get(profile.profileImage.storageKey, profile.profileImage.mimeType);
  }
}
