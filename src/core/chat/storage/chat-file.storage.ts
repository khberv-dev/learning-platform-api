import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';

const DEST = './uploads/chat';
mkdirSync(DEST, { recursive: true });

export const CHAT_FILE_MAX_BYTES = 50 * 1024 * 1024;

export const chatFileStorage = diskStorage({
  destination: DEST,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

export const toChatFilePath = (filename: string) => `/chat/${filename}`;
