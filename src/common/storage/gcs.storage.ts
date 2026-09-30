import { ServiceUnavailableException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import type { StorageEngine } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export const LESSONS_BUCKET = 'learning_platform_lessons';
export const GENERAL_BUCKET = 'learning_platform_general';

const LESSONS_FOLDER = 'lesson';
const SIGNED_URL_TTL_MS = 6 * 60 * 60 * 1000;

let client: Storage | null = null;

function parseCredentials(raw: string): { projectId: string; clientEmail: string; privateKey: string } {
  const trimmed = raw.trim();
  const json = trimmed.startsWith('{') ? trimmed : Buffer.from(trimmed, 'base64').toString('utf8');
  const parsed = JSON.parse(json) as { project_id?: string; client_email?: string; private_key?: string };

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('project_id / client_email / private_key topilmadi');
  }

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key.replace(/\\n/g, '\n'),
  };
}

function getClient(): Storage {
  if (client) return client;

  const raw = process.env.GOOGLE_CLOUD_STORAGE_JSON;
  if (!raw?.trim()) throw new ServiceUnavailableException('Fayl ombori sozlanmagan');

  let credentials: ReturnType<typeof parseCredentials>;
  try {
    credentials = parseCredentials(raw);
  } catch {
    throw new ServiceUnavailableException('Fayl ombori sozlamasi yaroqsiz');
  }

  client = new Storage({
    projectId: credentials.projectId,
    credentials: { client_email: credentials.clientEmail, private_key: credentials.privateKey },
  });
  return client;
}

export function bucketForPath(path: string): string {
  return path.startsWith(`${LESSONS_FOLDER}/`) ? LESSONS_BUCKET : GENERAL_BUCKET;
}

export async function signedFileUrl(path: string): Promise<string> {
  const objectPath = path.replace(/^\/+/, '');
  const [url] = await getClient()
    .bucket(bucketForPath(objectPath))
    .file(objectPath)
    .getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + SIGNED_URL_TTL_MS });
  return url;
}

export async function uploadLocalFile(localPath: string, objectPath: string): Promise<void> {
  await getClient().bucket(bucketForPath(objectPath)).upload(localPath, { destination: objectPath });
}

export async function storedFileExists(path: string): Promise<boolean> {
  const objectPath = path.replace(/^\/+/, '');
  const [exists] = await getClient().bucket(bucketForPath(objectPath)).file(objectPath).exists();
  return exists;
}

export async function deleteStoredFile(path: string): Promise<void> {
  const objectPath = path.replace(/^\/+/, '');
  await getClient().bucket(bucketForPath(objectPath)).file(objectPath).delete({ ignoreNotFound: true });
}

export function gcsStorage(folder: string | ((file: Express.Multer.File) => string)): StorageEngine {
  return {
    _handleFile(_req, file, cb) {
      let storage: Storage;
      try {
        storage = getClient();
      } catch (error) {
        return cb(error);
      }

      const filename = `${randomUUID()}${extname(file.originalname)}`;
      const objectPath = `${typeof folder === 'string' ? folder : folder(file)}/${filename}`;
      const upload = storage
        .bucket(bucketForPath(objectPath))
        .file(objectPath)
        .createWriteStream({ contentType: file.mimetype });

      let size = 0;
      file.stream.on('data', (chunk: Buffer) => (size += chunk.length));
      file.stream.on('error', (error) => upload.destroy(error));
      upload.on('error', (error) => cb(error));
      upload.on('finish', () => cb(null, { filename, path: objectPath, size }));
      file.stream.pipe(upload);
    },

    _removeFile(_req, file, cb) {
      deleteStoredFile(file.path).then(
        () => cb(null),
        (error: Error) => cb(error),
      );
    },
  };
}
