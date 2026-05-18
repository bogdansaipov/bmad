export class ActiveJobResponseDto {
  requestId!: string;
  title!: string;
  description!: string | null;
  status!: string;
  categoryName!: string;
  estimatedTotal!: number | null;
  locationLat!: number | null;
  locationLng!: number | null;
  createdAt!: string;
}
