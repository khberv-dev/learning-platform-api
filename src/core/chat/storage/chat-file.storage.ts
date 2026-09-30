import { gcsStorage } from '@/common/storage/gcs.storage';

export const CHAT_FILE_MAX_BYTES = 50 * 1024 * 1024;

export const chatFileStorage = gcsStorage('chat');

export const toChatFilePath = (filename: string) => `chat/${filename}`;
