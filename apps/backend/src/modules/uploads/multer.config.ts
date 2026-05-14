import * as path from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'request-images');

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const requestImageMulterOptions = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const extension = MIME_EXTENSION_MAP[file.mimetype];
      cb(null, `${randomUUID()}${extension ?? ''}`);
    },
  }),
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!MIME_EXTENSION_MAP[file.mimetype]) {
      cb(new BadRequestException('Unsupported file type'), false);
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
};
