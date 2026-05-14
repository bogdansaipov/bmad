import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNumber,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { HANDYMAN_MAX_CATEGORIES, HANDYMAN_SERVICE_RADIUS_BOUNDS } from '@handrix/contracts';

export class UpdateHandymanProfileDto {
  @ApiProperty({
    minimum: HANDYMAN_SERVICE_RADIUS_BOUNDS.min,
    maximum: HANDYMAN_SERVICE_RADIUS_BOUNDS.max,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(HANDYMAN_SERVICE_RADIUS_BOUNDS.min)
  @Max(HANDYMAN_SERVICE_RADIUS_BOUNDS.max)
  serviceRadiusKm!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(HANDYMAN_MAX_CATEGORIES)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  categoryIds!: string[];
}
