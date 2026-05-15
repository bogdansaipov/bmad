export class HandymanJobHistoryItemDto {
  offerId!: string;
  requestId!: string;
  offerStatus!: string;
  requestTitle!: string;
  requestDescription!: string;
  categoryName!: string;
  estimatedTotal!: number;
  requestStatus!: string;
  offeredAt!: string;
  respondedAt!: string | null;
}

export type HandymanJobHistoryResponseDto = HandymanJobHistoryItemDto[];
