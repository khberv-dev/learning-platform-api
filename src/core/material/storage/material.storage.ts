import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';

const DEST = './uploads/material';
mkdirSync(DEST, { recursive: true });

export const materialStorage = diskStorage({
  destination: DEST,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

export function materialFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (file.mimetype !== 'application/pdf' && !file.mimetype.startsWith('image/')) {
    return cb(new BadRequestException('Faqat PDF yoki rasm fayllari qabul qilinadi'), false);
  }
  cb(null, true);
}

export const toMaterialPath = (filename: string) => `/material/${filename}`;
