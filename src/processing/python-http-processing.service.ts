import { Injectable, RequestTimeoutException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MotionProcessingService } from './motion-processing.service';

@Injectable()
export class PythonHttpProcessingService implements MotionProcessingService {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get('PYTHON_ENGINE_URL', 'http://localhost:8000').replace(/\/+$/, '');
    this.timeoutMs = Number(config.get('PYTHON_ENGINE_TIMEOUT_MS', 300000));
  }

  analyze(input: { inputKey: string; analysisOutputKey: string }) {
    return this.post('/process/analyze', input);
  }

  render(input: {
    inputKey: string;
    analysisKey: string;
    outputKey: string;
    corrections: unknown[];
    slowMotionSegments: unknown[];
  }) {
    return this.post('/process/render', input);
  }

  private async post(path: string, body: unknown) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.ok) return;
      let detail = 'The motion engine could not process the video.';
      try {
        const payload = await response.json() as { detail?: string };
        if (payload.detail) detail = payload.detail;
      } catch { /* retain controlled message */ }
      if (response.status === 422) throw new UnprocessableEntityException(detail);
      throw new ServiceUnavailableException('The motion engine is unavailable.');
    } catch (error) {
      if (error instanceof UnprocessableEntityException || error instanceof ServiceUnavailableException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException('The motion engine timed out.');
      }
      throw new ServiceUnavailableException('The motion engine is unavailable.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
