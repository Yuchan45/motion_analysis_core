import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { streamFile } from '../storage/stream-file';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VideosService } from './videos.service';

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Post()
  @UseInterceptors(FileInterceptor('video', { limits: { fileSize: Number(process.env.MAX_VIDEO_SIZE ?? 104857600) } }))
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateVideoDto, @UploadedFile() file?: Express.Multer.File) {
    return this.videos.create(user.id, dto, file);
  }

  @Get()
  list(@CurrentUser() user: { id: string }) { return this.videos.list(user.id); }

  @Get(':id')
  get(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.videos.get(id, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVideoDto) {
    return this.videos.update(id, user.id, dto.title);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.videos.delete(id, user.id);
  }

  @Get(':id/content')
  async content(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const file = await this.videos.content(id, user.id);
    streamFile(file.resource, request, response, file.filename);
  }
}
