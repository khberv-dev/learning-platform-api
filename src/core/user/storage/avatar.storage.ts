import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';

const DEST = './uploads/avatar';
mkdirSync(DEST, { recursive: true });

export const avatarStorage = diskStorage({
  destination: DEST,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

export function avatarFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new BadRequestException('Faqat rasm fayllari qabul qilinadi'), false);
  }
  cb(null, true);
}

export const toAvatarPath = (filename: string) => `/avatar/${filename}`;
