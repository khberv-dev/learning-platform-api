import { BadRequestException } from '@nestjs/common';
import { basename } from 'path';
import { deleteStoredFile, gcsStorage } from '@/common/storage/gcs.storage';

export const lessonMediaStorage = gcsStorage('lesson');

export function videoFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!file.mimetype.startsWith('video/')) {
    return cb(new BadRequestException('Faqat video fayllar qabul qilinadi'), false);
  }
  cb(null, true);
}

export const toMediaPath = (filename: string) => `lesson/${filename}`;

export async function removeLessonMediaFile(media: string | null | undefined): Promise<void> {
  if (!media?.startsWith('lesson/')) return;
  const filename = basename(media);
  if (media !== `lesson/${filename}`) return;

  await deleteStoredFile(media);
}
