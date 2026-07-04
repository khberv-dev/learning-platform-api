import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';

const DEST = './uploads/task-audio';
mkdirSync(DEST, { recursive: true });

export const taskAudioStorage = diskStorage({
  destination: DEST,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

export function audioFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!file.mimetype.startsWith('audio/')) {
    return cb(new BadRequestException('Faqat audio fayllar qabul qilinadi'), false);
  }
  cb(null, true);
}

export const toAudioPath = (filename: string) => `task-audio/${filename}`;
