import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateAnalysisDto {
  @IsOptional()
  @IsString()
  @IsIn(['pose-overlay'])
  type: string = 'pose-overlay';
}
