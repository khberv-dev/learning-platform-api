import { BadRequestException } from '@nestjs/common';
import { gcsStorage } from '@/common/storage/gcs.storage';

export const courseImageStorage = gcsStorage('course');

export function imageFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new BadRequestException('Faqat rasm fayllari qabul qilinadi'), false);
  }
  cb(null, true);
}

export const toImagePath = (filename: string) => `course/${filename}`;
