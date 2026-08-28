import { BadRequestException, Inject, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { VideoStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { extname, parse } from 'node:path';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { VideosRepository } from './videos.repository';

const MIME_BY_EXTENSION: Record<string, string[]> = {
  '.mp4': ['video/mp4'],
  '.mov': ['video/quicktime', 'video/mp4'],
  '.avi': ['video/x-msvideo', 'video/avi'],
  '.mkv': ['video/x-matroska'],
  '.webm': ['video/webm'],
};

@Injectable()
export class VideosService {
  constructor(
    private readonly videos: VideosRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async create(userId: string, dto: CreateVideoDto, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('A video file is required.');
    const extension = extname(file.originalname).toLowerCase();
    this.validateVideo(file, extension);
    const id = randomUUID();
    const storageKey = `users/${userId}/videos/${id}/original${extension}`;
    const title = dto.title?.trim() || parse(file.originalname).name.slice(0, 160) || 'Untitled video';
    const record = await this.videos.create({
      id,
      userId,
      title,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey,
      status: VideoStatus.UPLOADING,
    });
    try {
      await this.storage.save(storageKey, file.buffer);
      return this.present(await this.videos.updateStatus(record.id, VideoStatus.READY));
    } catch (error) {
      await this.videos.updateStatus(record.id, VideoStatus.FAILED);
      await this.storage.deletePrefix(`users/${userId}/videos/${id}`);
      throw error;
    }
  }

  async list(userId: string) {
    return (await this.videos.findByUser(userId)).map((video) => this.present(video));
  }

  async getOwned(id: string, userId: string) {
    const video = await this.videos.findByIdForUser(id, userId);
    if (!video) throw new NotFoundException('Video not found.');
    return video;
  }

  async get(id: string, userId: string) {
    return this.present(await this.getOwned(id, userId));
  }

  async update(id: string, userId: string, title: string) {
    await this.getOwned(id, userId);
    return this.present(await this.videos.updateTitle(id, title.trim()));
  }

  async delete(id: string, userId: string) {
    await this.getOwned(id, userId);
    await this.storage.deletePrefix(`users/${userId}/videos/${id}`);
    await this.videos.delete(id);
  }

  async content(id: string, userId: string) {
    const video = await this.getOwned(id, userId);
    return { resource: await this.storage.get(video.storageKey, video.mimeType), filename: video.originalFilename };
  }

  private validateVideo(file: Express.Multer.File, extension: string) {
    const allowedMimes = MIME_BY_EXTENSION[extension];
    if (!allowedMimes || !allowedMimes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Unsupported video format. Use MP4, MOV, AVI, MKV, or WebM.');
    }
    const bytes = file.buffer;
    const isIsoMedia = bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp';
    const isAvi = bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'AVI ';
    const isEbml = bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    const validSignature = ['.mp4', '.mov'].includes(extension) ? isIsoMedia : extension === '.avi' ? isAvi : isEbml;
    if (!validSignature) throw new UnsupportedMediaTypeException('The uploaded file signature does not match its video format.');
  }

  present(video: { id: string; title: string; originalFilename: string; mimeType: string; sizeBytes: number; status: VideoStatus; createdAt: Date; updatedAt: Date }) {
    return {
      id: video.id,
      title: video.title,
      originalFilename: video.originalFilename,
      mimeType: video.mimeType,
      sizeBytes: video.sizeBytes,
      status: video.status,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    };
  }
}
