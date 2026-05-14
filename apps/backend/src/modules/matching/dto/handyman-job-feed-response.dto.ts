export class HandymanJobFeedItemDto {
  requestId!: string;
  categoryName!: string;
  distanceKm!: number;
  roughAreaLabel!: string;
  estimatedTotal!: number | null;
  shortDescription!: string;
  createdAt!: string;
}

export class HandymanJobFeedResponseDto {
  items!: HandymanJobFeedItemDto[];
}
