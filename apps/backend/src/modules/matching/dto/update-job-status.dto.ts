import { IsIn } from 'class-validator';

export class UpdateJobStatusDto {
  @IsIn(['ON_THE_WAY', 'ARRIVED', 'WORKING', 'COMPLETE'])
  status!: string;
}
