import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { MaterialType } from '@/core/material/enum/material-type.enum';

const DEST = './uploads/material';
mkdirSync(DEST, { recursive: true });

/** Qabul qilinadigan mime turlari va ularga mos material turi. */
const MIME_TYPES: Record<string, MaterialType> = {
  'application/pdf': MaterialType.PDF,
  'application/msword': MaterialType.DOC,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': MaterialType.DOC,
};

/**
 * Ba'zi mijozlar `.doc` / `.docx` uchun noto'g'ri mime yuboradi
 * (masalan `application/octet-stream`), shuning uchun kengaytma zaxira sifatida
 * tekshiriladi.
 */
const EXTENSIONS: Record<string, MaterialType> = {
  '.pdf': MaterialType.PDF,
  '.doc': MaterialType.DOC,
  '.docx': MaterialType.DOC,
};

/** Fayl turini aniqlaydi — mos kelmasa `undefined`. */
export function materialTypeFor(file: Express.Multer.File): MaterialType | undefined {
  return MIME_TYPES[file.mimetype] ?? EXTENSIONS[extname(file.originalname).toLowerCase()];
}

export const materialStorage = diskStorage({
  destination: DEST,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

export function materialFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!materialTypeFor(file)) {
    return cb(new BadRequestException('Faqat PDF yoki Word (doc, docx) fayllari qabul qilinadi'), false);
  }
  cb(null, true);
}

export const toMaterialPath = (filename: string) => `/material/${filename}`;
