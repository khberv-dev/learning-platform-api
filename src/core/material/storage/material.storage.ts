import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { MaterialType } from '@/core/material/enum/material-type.enum';
import { gcsStorage } from '@/common/storage/gcs.storage';

const MIME_TYPES: Record<string, MaterialType> = {
  'application/pdf': MaterialType.PDF,
  'application/msword': MaterialType.DOC,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': MaterialType.DOC,
};

const EXTENSIONS: Record<string, MaterialType> = {
  '.pdf': MaterialType.PDF,
  '.doc': MaterialType.DOC,
  '.docx': MaterialType.DOC,
};

export function materialTypeFor(file: Express.Multer.File): MaterialType | undefined {
  return MIME_TYPES[file.mimetype] ?? EXTENSIONS[extname(file.originalname).toLowerCase()];
}

export const materialStorage = gcsStorage('material');

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

export const toMaterialPath = (filename: string) => `material/${filename}`;
