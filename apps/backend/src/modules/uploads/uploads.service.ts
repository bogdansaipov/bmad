import * as fs from 'fs/promises';
import * as path from 'path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import { PrismaService } from '../prisma/prisma.service';
import { ImageUploadResponseDto } from './dto/image-upload-response.dto';

const ALLOWED_MIME: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async storeRequestImage(userId: string, file: Express.Multer.File): Promise<ImageUploadResponseDto> {
    const absolutePath = path.resolve(file.path);
    try {
      let buf: Buffer;
      const handle = await fs.open(absolutePath, 'r');
      try {
        buf = Buffer.alloc(4100);
        await handle.read(buf, 0, 4100, 0);
      } finally {
        await handle.close();
      }

      const detected = await fileTypeFromBuffer(buf);
      if (!detected || !ALLOWED_MIME.has(detected.mime)) {
        await fs.unlink(absolutePath).catch(() => undefined);
        throw new BadRequestException('Unsupported file type');
      }
      if (detected.mime !== file.mimetype) {
        await fs.unlink(absolutePath).catch(() => undefined);
        throw new BadRequestException('Unsupported file type');
      }

      const created = await this.prisma.requestImage.create({
        data: {
          uploaderId: userId,
          filePath: file.path,
          mimeType: detected.mime,
          sizeBytes: file.size,
        },
        select: { id: true },
      });
      return { imageId: created.id };
    } catch (error) {
      await fs.unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  }
}
