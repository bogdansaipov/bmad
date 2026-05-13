import { ApiProperty } from '@nestjs/swagger';
import { RequestStatus } from '@prisma/client';

export class ServiceRequestListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: RequestStatus, enumName: 'RequestStatus' })
  status!: RequestStatus;

  @ApiProperty({ nullable: true, type: Number })
  estimatedTotal!: number | null;

  @ApiProperty()
  categoryName!: string;

  @ApiProperty({ nullable: true, type: String })
  assignedHandymanDisplayName!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class CustomerRequestListResponseDto {
  @ApiProperty({ type: [ServiceRequestListItemDto] })
  items!: ServiceRequestListItemDto[];
}
