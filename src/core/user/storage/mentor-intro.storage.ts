import { BadRequestException } from '@nestjs/common';
import { gcsStorage } from '@/common/storage/gcs.storage';

export const mentorIntroStorage = gcsStorage('mentor-intro');

export function introVideoFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!file.mimetype.startsWith('video/')) {
    return cb(new BadRequestException('Faqat video fayllar qabul qilinadi'), false);
  }
  cb(null, true);
}

export const toIntroVideoPath = (filename: string) => `mentor-intro/${filename}`;
