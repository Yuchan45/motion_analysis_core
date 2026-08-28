import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AnalysisStatus, Prisma, VideoStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { MOTION_PROCESSING_SERVICE, MotionProcessingService } from '../processing/motion-processing.service';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.service';
import { VideosService } from '../videos/videos.service';
import { AnalysesRepository } from './analyses.repository';
import { EditorStateDto } from './dto/editor-state.dto';

type AnalysisPayload = {
  metadata: { frame_count: number };
  landmark_indices: number[];
};

@Injectable()
export class AnalysesService {
  constructor(
    private readonly analyses: AnalysesRepository,
    private readonly videos: VideosService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Inject(MOTION_PROCESSING_SERVICE) private readonly processing: MotionProcessingService,
  ) {}

  async create(videoId: string, userId: string, type: string) {
    const video = await this.videos.getOwned(videoId, userId);
    if (video.status !== VideoStatus.READY) throw new BadRequestException('Video is not ready for analysis.');
    const id = randomUUID();
    const dataKey = `users/${userId}/videos/${videoId}/analyses/${id}/analysis.json`;
    await this.analyses.create(id, videoId, type);
    await this.analyses.markProcessing(id);
    try {
      await this.processing.analyze({ inputKey: video.storageKey, analysisOutputKey: dataKey });
      await this.storage.get(dataKey, 'application/json');
      return this.present(await this.analyses.markCompleted(id, { analysisDataKey: dataKey }));
    } catch (error) {
      await this.analyses.markFailed(id, this.safeError(error));
      throw error;
    }
  }

  async list(videoId: string, userId: string) {
    await this.videos.getOwned(videoId, userId);
    return (await this.analyses.listForVideo(videoId)).map((analysis) => this.present(analysis));
  }

  async getOwned(id: string, userId: string) {
    const analysis = await this.analyses.findOwned(id, userId);
    if (!analysis) throw new NotFoundException('Analysis not found.');
    return analysis;
  }

  async get(id: string, userId: string) { return this.present(await this.getOwned(id, userId)); }

  async data(id: string, userId: string) {
    const analysis = await this.getOwned(id, userId);
    if (!analysis.analysisDataKey) throw new NotFoundException('Analysis data is not available.');
    return this.storage.readJson<AnalysisPayload>(analysis.analysisDataKey);
  }

  async updateEditor(id: string, userId: string, state: EditorStateDto) {
    const analysis = await this.getOwned(id, userId);
    if (!analysis.analysisDataKey) throw new BadRequestException('Analysis data is not available.');
    const payload = await this.storage.readJson<AnalysisPayload>(analysis.analysisDataKey);
    const supported = new Set(payload.landmark_indices);
    if (state.corrections.some((item) => item.frame_index >= payload.metadata.frame_count || !supported.has(item.landmark_index))) {
      throw new BadRequestException('A correction references an unsupported frame or landmark.');
    }
    const segments = [...state.slowMotionSegments].sort((a, b) => a.start_frame - b.start_frame);
    if (segments.some((item, index) => item.end_frame <= item.start_frame
      || item.end_frame >= payload.metadata.frame_count
      || (index > 0 && item.start_frame <= segments[index - 1].end_frame))) {
      throw new BadRequestException('Slow-motion segments are invalid or overlap.');
    }
    if (analysis.processedVideoKey) await this.storage.delete(analysis.processedVideoKey);
    return this.present(await this.analyses.updateEditorState(id, state as unknown as Prisma.InputJsonValue));
  }

  async render(id: string, userId: string) {
    const analysis = await this.getOwned(id, userId);
    if (!analysis.analysisDataKey) throw new BadRequestException('Analysis data is not available.');
    const outputKey = `users/${userId}/videos/${analysis.videoId}/analyses/${id}/result.mp4`;
    const editor = analysis.editorState as { corrections?: unknown[]; slowMotionSegments?: unknown[] };
    await this.analyses.markProcessing(id);
    try {
      await this.processing.render({
        inputKey: analysis.video.storageKey,
        analysisKey: analysis.analysisDataKey,
        outputKey,
        corrections: editor.corrections ?? [],
        slowMotionSegments: editor.slowMotionSegments ?? [],
      });
      await this.storage.get(outputKey, 'video/mp4');
      return this.present(await this.analyses.markCompleted(id, { processedVideoKey: outputKey }));
    } catch (error) {
      await this.analyses.markFailed(id, this.safeError(error));
      throw error;
    }
  }

  async result(id: string, userId: string) {
    const analysis = await this.getOwned(id, userId);
    if (!analysis.processedVideoKey) throw new NotFoundException('Rendered video is not available.');
    return this.storage.get(analysis.processedVideoKey, 'video/mp4');
  }

  present(analysis: { id: string; videoId: string; type: string; version: string; status: AnalysisStatus; editorState: unknown; analysisDataKey: string | null; processedVideoKey: string | null; createdAt: Date; startedAt: Date | null; completedAt: Date | null; error: string | null }) {
    return {
      id: analysis.id,
      videoId: analysis.videoId,
      type: analysis.type,
      version: analysis.version,
      status: analysis.status,
      editorState: analysis.editorState,
      hasData: Boolean(analysis.analysisDataKey),
      hasResult: Boolean(analysis.processedVideoKey),
      createdAt: analysis.createdAt,
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt,
      error: analysis.status === AnalysisStatus.FAILED ? analysis.error : null,
    };
  }

  private safeError(error: unknown) {
    return error instanceof Error ? error.message.slice(0, 500) : 'Video processing failed.';
  }
}
