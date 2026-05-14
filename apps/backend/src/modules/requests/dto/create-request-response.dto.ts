import { ApiProperty } from '@nestjs/swagger';
import { RequestStatus } from '@prisma/client';

export class CreateRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RequestStatus, enumName: 'RequestStatus' })
  status!: RequestStatus;

  @ApiProperty({ nullable: true, type: Number })
  estimatedTotal!: number | null;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty()
  createdAt!: string;
}
