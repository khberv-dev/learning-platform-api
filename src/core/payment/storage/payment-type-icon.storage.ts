import { BadRequestException } from '@nestjs/common';
import { gcsStorage } from '@/common/storage/gcs.storage';

export const paymentTypeIconStorage = gcsStorage('payment-type');

export function iconFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new BadRequestException('Faqat rasm fayllari qabul qilinadi'), false);
  }
  cb(null, true);
}

export const toIconPath = (filename: string) => `payment-type/${filename}`;
