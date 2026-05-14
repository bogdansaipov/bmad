import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImageUploadResponseDto } from './dto/image-upload-response.dto';

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async storeRequestImage(userId: string, file: Express.Multer.File): Promise<ImageUploadResponseDto> {
    try {
      const created = await this.prisma.requestImage.create({
        data: {
          uploaderId: userId,
          filePath: file.path,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
        select: { id: true },
      });

      return { imageId: created.id };
    } catch (error) {
      await fs.unlink(path.resolve(file.path)).catch(() => undefined);
      throw error;
    }
  }
}
