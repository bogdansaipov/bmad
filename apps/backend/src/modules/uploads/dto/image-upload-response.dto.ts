import { ApiProperty } from '@nestjs/swagger';

export class ImageUploadResponseDto {
  @ApiProperty()
  imageId!: string;
}
