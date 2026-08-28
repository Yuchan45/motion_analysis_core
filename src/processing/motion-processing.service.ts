export const MOTION_PROCESSING_SERVICE = Symbol('MOTION_PROCESSING_SERVICE');

export interface MotionProcessingService {
  analyze(input: { inputKey: string; analysisOutputKey: string }): Promise<void>;
  render(input: {
    inputKey: string;
    analysisKey: string;
    outputKey: string;
    corrections: unknown[];
    slowMotionSegments: unknown[];
  }): Promise<void>;
}
