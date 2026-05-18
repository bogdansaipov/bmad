import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../auth';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { ImageUploadResponseDto } from './dto/image-upload-response.dto';
import { requestImageMulterOptions } from './multer.config';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('request-image')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles(UserRole.CUSTOMER)
  @UseInterceptors(FileInterceptor('file', requestImageMulterOptions))
  @ApiOperation({ summary: 'Upload a request image for later request submission' })
  uploadRequestImage(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImageUploadResponseDto> {
    return this.uploadsService.storeRequestImage(user.userId, file);
  }
}
