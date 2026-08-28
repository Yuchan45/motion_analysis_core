import { Module } from '@nestjs/common';
import { MOTION_PROCESSING_SERVICE } from './motion-processing.service';
import { PythonHttpProcessingService } from './python-http-processing.service';

@Module({
  providers: [PythonHttpProcessingService, { provide: MOTION_PROCESSING_SERVICE, useExisting: PythonHttpProcessingService }],
  exports: [MOTION_PROCESSING_SERVICE],
})
export class ProcessingModule {}
