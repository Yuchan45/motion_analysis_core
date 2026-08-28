import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProcessingModule } from '../processing/processing.module';
import { VideosModule } from '../videos/videos.module';
import { AnalysesController } from './analyses.controller';
import { AnalysesRepository } from './analyses.repository';
import { AnalysesService } from './analyses.service';

@Module({
  imports: [AuthModule, VideosModule, ProcessingModule],
  controllers: [AnalysesController],
  providers: [AnalysesRepository, AnalysesService],
})
export class AnalysesModule {}
