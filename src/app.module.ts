import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysesModule } from './analyses/analyses.module';
import { AuthModule } from './auth/auth.module';
import { OriginValidationMiddleware } from './common/middleware/origin-validation.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { ProcessingModule } from './processing/processing.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { VideosModule } from './videos/videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    VideosModule,
    ProcessingModule,
    AnalysesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OriginValidationMiddleware).forRoutes('*');
  }
}
