import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.service';
import { UpdateProfileDto } from '../auth/dto/credentials.dto';
import { prepareProfileAvatar } from './profile-avatar';
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

  async updateOwnProfile(id: string, dto: UpdateProfileDto, file?: Express.Multer.File) {
    const avatarChanged = dto.avatarSource !== undefined;
    const avatar = prepareProfileAvatar(dto, file);
    let newImage: { id: string; storageKey: string | null } | undefined;

    if (avatar) {
      const image = await this.users.createProfileImage(avatar.metadata);
      newImage = { id: image.id, storageKey: null };
      if (avatar.file) {
        const storageKey = `profile-images/${id}/${image.id}/original${avatar.file.extension}`;
        try {
          await this.users.updateProfileImageStorageKey(image.id, storageKey);
          await this.storage.save(storageKey, avatar.file.buffer);
          newImage.storageKey = storageKey;
        } catch (error) {
          await this.storage.deletePrefix(`profile-images/${id}/${image.id}`);
          await this.users.deleteProfileImage(image.id);
          throw error;
        }
      }
    }

    try {
      const result = await this.users.updateOwnProfile({
        userId: id,
        displayName: dto.displayName,
        bio: dto.bio,
        replaceAvatar: avatarChanged,
        newImageId: newImage?.id,
      });
      if (result.previousStorageKey) await this.storage.delete(result.previousStorageKey).catch(() => undefined);
      return presentUser(result.user);
    } catch (error) {
      if (newImage) {
        if (newImage.storageKey) await this.storage.delete(newImage.storageKey).catch(() => undefined);
        await this.users.deleteProfileImage(newImage.id).catch(() => undefined);
      }
      throw error;
    }
  }

  async getOwnProfileImage(imageId: string, userId: string) {
    const profile = await this.users.findProfileImageForUser(imageId, userId);
    if (!profile?.profileImage?.storageKey || !profile.profileImage.mimeType) throw new NotFoundException('Profile image not found.');
    return this.storage.get(profile.profileImage.storageKey, profile.profileImage.mimeType);
  }
}
