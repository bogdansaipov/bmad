export class HandymanJobFeedItemDto {
  offerId!: string;
  requestId!: string;
  categoryName!: string;
  distanceKm!: number | null;
  roughArea!: string | null;
  estimatedTotal!: number;
  shortDescription!: string;
  offeredAt!: string;
}

export type HandymanJobFeedResponseDto = HandymanJobFeedItemDto[];
