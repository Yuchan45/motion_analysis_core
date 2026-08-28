import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVideoDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;
}
