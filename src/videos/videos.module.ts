import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VideosController } from './videos.controller';
import { VideosRepository } from './videos.repository';
import { VideosService } from './videos.service';

@Module({
  imports: [AuthModule],
  controllers: [VideosController],
  providers: [VideosRepository, VideosService],
  exports: [VideosRepository, VideosService],
})
export class VideosModule {}
