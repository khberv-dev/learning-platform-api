import { BadRequestException } from '@nestjs/common';
import { gcsStorage } from '@/common/storage/gcs.storage';

export const avatarStorage = gcsStorage('avatar');

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

export const toAvatarPath = (filename: string) => `avatar/${filename}`;
