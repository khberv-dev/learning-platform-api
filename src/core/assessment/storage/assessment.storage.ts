import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';

const INPUT_DEST = './uploads/assessment-input';
export const ASSESSMENT_OUTPUT_DEST = './uploads/assessment-output';
mkdirSync(INPUT_DEST, { recursive: true });
mkdirSync(ASSESSMENT_OUTPUT_DEST, { recursive: true });

export const assessmentInputStorage = diskStorage({
  destination: INPUT_DEST,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname) || '.bin'}`),
});

export function audioFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!file.mimetype.startsWith('audio/')) {
    return cb(new BadRequestException('Faqat audio fayllar qabul qilinadi'), false);
  }
  cb(null, true);
}

export const toInputAudioPath = (filename: string) => `/assessment-input/${filename}`;
export const toReplyAudioPath = (filename: string) => `/assessment-output/${filename}`;
