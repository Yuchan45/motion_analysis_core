import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsIn, IsInt, IsNumber, Max, Min, ValidateNested } from 'class-validator';

export class CorrectionDto {
  @IsInt() @Min(0) frame_index!: number;
  @IsInt() landmark_index!: number;
  @IsNumber() @Min(0) @Max(1) x!: number;
  @IsNumber() @Min(0) @Max(1) y!: number;
}

export class SlowMotionSegmentDto {
  @IsInt() @Min(0) start_frame!: number;
  @IsInt() @Min(0) end_frame!: number;
  @IsIn([0.5, 0.25, 0.125]) speed!: 0.5 | 0.25 | 0.125;
}

export class EditorStateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrectionDto)
  @ArrayUnique((item: CorrectionDto) => `${item.frame_index}:${item.landmark_index}`)
  corrections!: CorrectionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlowMotionSegmentDto)
  slowMotionSegments!: SlowMotionSegmentDto[];
}
