import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class SubmitRatingDto {
  @IsUUID()
  requestId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortFeedback?: string;
}
