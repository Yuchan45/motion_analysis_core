import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateVideoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;
}
