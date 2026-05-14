import { IsUUID } from 'class-validator';

export class GetEstimateQueryDto {
  @IsUUID()
  categoryId!: string;
}
