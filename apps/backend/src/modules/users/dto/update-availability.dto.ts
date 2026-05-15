import { IsIn } from 'class-validator';

export class UpdateHandymanAvailabilityDto {
  @IsIn(['online', 'offline'])
  availabilityStatus!: string;
}
