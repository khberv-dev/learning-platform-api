import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { basename, extname, resolve } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { unlink } from 'fs/promises';

const DEST = resolve(process.cwd(), 'uploads/lesson');
mkdirSync(DEST, { recursive: true });

export const lessonMediaStorage = diskStorage({
  destination: DEST,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

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

export const toMediaPath = (filename: string) => `/lesson/${filename}`;

/** Faqat shu storage yaratgan lokal faylni o'chiradi; tashqi yoki traversal yo'llariga tegmaydi. */
export async function removeLessonMediaFile(media: string | null | undefined): Promise<void> {
  if (!media?.startsWith('/lesson/')) return;
  const filename = basename(media);
  if (media !== `/lesson/${filename}`) return;

  try {
    await unlink(resolve(DEST, filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
