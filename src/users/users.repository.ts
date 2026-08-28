import { Injectable } from '@nestjs/common';
import { Prisma, ProfileImageSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const userWithProfile = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { role: true, profile: { include: { profileImage: true } } },
});

export type UserWithProfile = Prisma.UserGetPayload<typeof userWithProfile>;

export type RegistrationAvatar = {
  sourceType: ProfileImageSourceType;
  url?: string;
  provider?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export function presentUser(user: UserWithProfile) {
  const image = user.profile?.profileImage;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    role: user.role.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: {
      id: user.profile?.id ?? null,
      displayName: user.profile?.displayName ?? null,
      bio: user.profile?.bio ?? null,
      avatar: image ? {
        id: image.id,
        sourceType: image.sourceType,
        url: image.sourceType === ProfileImageSourceType.MANAGED ? `/profile-images/${image.id}` : image.url,
      } : null,
    },
  };
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({ where: { email }, ...userWithProfile });
  }

  findByUsername(username: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({ where: { username }, ...userWithProfile });
  }

  findById(id: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({ where: { id }, ...userWithProfile });
  }

  async createRegisteredUser(input: { email: string; username: string; passwordHash: string; avatar?: RegistrationAvatar }): Promise<UserWithProfile> {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { name: 'FREE' } });
      if (!role) throw new Error('The FREE role is not configured.');

      const image = input.avatar ? await tx.profileImage.create({ data: input.avatar }) : null;
      return tx.user.create({
        data: {
          email: input.email,
          username: input.username,
          passwordHash: input.passwordHash,
          role: { connect: { id: role.id } },
          profile: {
            create: {
              displayName: input.username,
              ...(image ? { profileImage: { connect: { id: image.id } } } : {}),
            },
          },
        },
        ...userWithProfile,
      });
    });
  }

  updateProfileImageStorageKey(id: string, storageKey: string) {
    return this.prisma.profileImage.update({ where: { id }, data: { storageKey } });
  }

  async deleteRegisteredUser(userId: string, imageId?: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: userId } });
      if (imageId) await tx.profileImage.delete({ where: { id: imageId } });
    });
  }

  findProfileImageForUser(imageId: string, userId: string) {
    return this.prisma.userProfile.findFirst({
      where: { userId, profileImageId: imageId },
      include: { profileImage: true },
    });
  }
}
