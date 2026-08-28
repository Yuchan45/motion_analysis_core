import { Body, Controller, HttpCode, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async register(@Body() dto: RegisterDto, @UploadedFile() file: Express.Multer.File | undefined, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.register(dto, file);
    this.setCookie(response, session.token);
    return session.user;
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(dto);
    this.setCookie(response, session.token);
    return session.user;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('motion_access_token', this.cookieOptions());
  }

  private setCookie(response: Response, token: string) {
    response.cookie('motion_access_token', token, {
      ...this.cookieOptions(),
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.get('NODE_ENV') === 'production',
      path: '/',
    };
  }
}
