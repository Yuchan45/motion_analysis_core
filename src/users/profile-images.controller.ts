import { Controller, Get, Param, ParseUUIDPipe, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { streamFile } from '../storage/stream-file';
import { UsersService } from './users.service';

@Controller('profile-images')
@UseGuards(JwtAuthGuard)
export class ProfileImagesController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  async get(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    streamFile(await this.users.getOwnProfileImage(id, user.id), request, response);
  }
}
