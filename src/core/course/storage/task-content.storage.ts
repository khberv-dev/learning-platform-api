import { BadRequestException } from '@nestjs/common';
import { TaskContentType } from '@/core/course/enum/task-content-type.enum';
import { gcsStorage } from '@/common/storage/gcs.storage';

const AUDIO_FOLDER = 'task-audio';
const PICTURE_FOLDER = 'task-picture';

const folderFor = (file: Express.Multer.File) => (file.mimetype.startsWith('image/') ? PICTURE_FOLDER : AUDIO_FOLDER);

export const taskContentStorage = gcsStorage(folderFor);

export function taskContentFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!file.mimetype.startsWith('audio/') && !file.mimetype.startsWith('image/')) {
    return cb(new BadRequestException('Faqat audio yoki rasm fayllari qabul qilinadi'), false);
  }
  cb(null, true);
}

export const taskContentTypeOf = (file: Express.Multer.File): TaskContentType =>
  file.mimetype.startsWith('image/') ? TaskContentType.PICTURE : TaskContentType.AUDIO;

export const toTaskContentPath = (file: Express.Multer.File): string => `${folderFor(file)}/${file.filename}`;
