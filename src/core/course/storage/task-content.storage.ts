import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { TaskContentType } from '@/core/course/enum/task-content-type.enum';

const AUDIO_DEST = './uploads/task-audio';
const PICTURE_DEST = './uploads/task-picture';
mkdirSync(AUDIO_DEST, { recursive: true });
mkdirSync(PICTURE_DEST, { recursive: true });

export const taskContentStorage = diskStorage({
  destination: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/') ? PICTURE_DEST : AUDIO_DEST);
  },
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

export function taskContentFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!file.mimetype.startsWith('audio/') && !file.mimetype.startsWith('image/')) {
    return cb(new BadRequestException('Faqat audio yoki rasm fayllari qabul qilinadi'), false);
  }
  cb(null, true);
}

export const taskContentTypeOf = (file: Express.Multer.File): TaskContentType =>
  file.mimetype.startsWith('image/') ? TaskContentType.PICTURE : TaskContentType.AUDIO;

export const toTaskContentPath = (file: Express.Multer.File): string =>
  file.mimetype.startsWith('image/') ? `/task-picture/${file.filename}` : `/task-audio/${file.filename}`;
