import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { ProfileImagesController } from './profile-images.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, ProfileImagesController],
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
