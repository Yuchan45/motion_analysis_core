import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { streamFile } from '../storage/stream-file';
import { AnalysesService } from './analyses.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { EditorStateDto } from './dto/editor-state.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AnalysesController {
  constructor(private readonly analyses: AnalysesService) {}

  @Post('videos/:videoId/analyses')
  create(
    @CurrentUser() user: { id: string },
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Body() dto: CreateAnalysisDto,
  ) { return this.analyses.create(videoId, user.id, dto.type); }

  @Get('videos/:videoId/analyses')
  list(@CurrentUser() user: { id: string }, @Param('videoId', ParseUUIDPipe) videoId: string) {
    return this.analyses.list(videoId, user.id);
  }

  @Get('analyses/:id')
  get(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.analyses.get(id, user.id);
  }

  @Get('analyses/:id/data')
  data(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.analyses.data(id, user.id);
  }

  @Put('analyses/:id/editor-state')
  updateEditor(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() state: EditorStateDto,
  ) { return this.analyses.updateEditor(id, user.id, state); }

  @Post('analyses/:id/render')
  @HttpCode(200)
  render(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.analyses.render(id, user.id);
  }

  @Get('analyses/:id/result')
  async result(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    streamFile(await this.analyses.result(id, user.id), request, response, 'processed-pitch.mp4');
  }
}
