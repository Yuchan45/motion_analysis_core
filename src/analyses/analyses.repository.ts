import { Injectable } from '@nestjs/common';
import { AnalysisStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalysesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(id: string, videoId: string, type: string) {
    return this.prisma.analysis.create({ data: { id, videoId, type, version: 'v1' } });
  }

  findOwned(id: string, userId: string) {
    return this.prisma.analysis.findFirst({ where: { id, video: { userId } }, include: { video: true } });
  }

  listForVideo(videoId: string) {
    return this.prisma.analysis.findMany({ where: { videoId }, orderBy: { createdAt: 'desc' } });
  }

  markProcessing(id: string) {
    return this.prisma.analysis.update({
      where: { id },
      data: { status: AnalysisStatus.PROCESSING, startedAt: new Date(), completedAt: null, error: null },
    });
  }

  markCompleted(id: string, data: { analysisDataKey?: string; processedVideoKey?: string }) {
    return this.prisma.analysis.update({
      where: { id },
      data: { ...data, status: AnalysisStatus.COMPLETED, completedAt: new Date(), error: null },
    });
  }

  markFailed(id: string, error: string) {
    return this.prisma.analysis.update({
      where: { id },
      data: { status: AnalysisStatus.FAILED, completedAt: new Date(), error },
    });
  }

  updateEditorState(id: string, editorState: Prisma.InputJsonValue) {
    return this.prisma.analysis.update({
      where: { id },
      data: { editorState, processedVideoKey: null, status: AnalysisStatus.COMPLETED, error: null },
    });
  }
}
