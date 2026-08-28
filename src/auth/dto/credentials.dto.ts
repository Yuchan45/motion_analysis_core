import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class RegisterDto extends LoginDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @Matches(/^[a-z0-9_-]{3,30}$/, { message: 'Username must be 3-30 lowercase letters, numbers, underscores, or hyphens.' })
  username!: string;

  @IsIn(['none', 'upload', 'generated'])
  avatarSource!: 'none' | 'upload' | 'generated';

  @ValidateIf((dto: RegisterDto) => dto.avatarSource === 'generated')
  @IsIn(['waves', 'stack', 'stripes', 'initial-face', 'patchwork'])
  diceBearStyle?: string;

  @ValidateIf((dto: RegisterDto) => dto.avatarSource === 'generated')
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,64}$/)
  diceBearSeed?: string;
}
