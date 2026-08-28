import { Injectable } from '@nestjs/common';
import { Video, VideoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideosRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Omit<Video, 'createdAt' | 'updatedAt'>) {
    return this.prisma.video.create({ data });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.video.findFirst({ where: { id, userId } });
  }

  findByUser(userId: string) {
    return this.prisma.video.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  updateStatus(id: string, status: VideoStatus) {
    return this.prisma.video.update({ where: { id }, data: { status } });
  }

  updateTitle(id: string, title: string) {
    return this.prisma.video.update({ where: { id }, data: { title } });
  }

  delete(id: string) {
    return this.prisma.video.delete({ where: { id } });
  }
}
