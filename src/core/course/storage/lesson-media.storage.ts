import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';

const DEST = './uploads/lesson';
mkdirSync(DEST, { recursive: true });

export const lessonMediaStorage = diskStorage({
  destination: DEST,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

export function videoFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!file.mimetype.startsWith('video/')) {
    return cb(new BadRequestException('Faqat video fayllar qabul qilinadi'), false);
  }
  cb(null, true);
}

export const toMediaPath = (filename: string) => `/lesson/${filename}`;
