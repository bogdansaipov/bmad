export class RequestTrackingResponseDto {
  requestId!: string;
  title!: string;
  status!: string;
  categoryName!: string;
  estimatedTotal!: number | null;
  description!: string | null;
  locationLat!: number | null;
  locationLng!: number | null;
  assignedHandymanDisplayName!: string | null;
  handymanLat!: number | null;
  handymanLng!: number | null;
  handymanLocationAt!: string | null;
  createdAt!: string;
}
