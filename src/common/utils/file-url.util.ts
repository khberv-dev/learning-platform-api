import { Logger } from '@nestjs/common';
import { signedFileUrl } from '@/common/storage/gcs.storage';

const UPLOAD_FOLDERS = [
  'avatar',
  'course',
  'lesson',
  'chat',
  'task-audio',
  'task-picture',
  'payment-type',
  'live-lesson-recording',
  'mentor-intro',
  'material',
];

const UPLOAD_PATH_RE = new RegExp(
  `^/?(${UPLOAD_FOLDERS.join('|')})/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.[A-Za-z0-9]+$`,
);

const MAX_DEPTH = 12;

const logger = new Logger('FileUrl');

function collectPaths(value: unknown, paths: Set<string>, depth = 0): void {
  if (depth > MAX_DEPTH || value === null || value === undefined) return;

  if (typeof value === 'string') {
    if (UPLOAD_PATH_RE.test(value)) paths.add(value);
    return;
  }
  if (value instanceof Date) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectPaths(item, paths, depth + 1));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectPaths(item, paths, depth + 1));
  }
}

function replacePaths(value: unknown, urls: Map<string, string | null>, depth = 0): unknown {
  if (depth > MAX_DEPTH || value === null || value === undefined) return value;

  if (typeof value === 'string') return urls.has(value) ? urls.get(value) : value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => replacePaths(item, urls, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replacePaths(item, urls, depth + 1)]),
    );
  }
  return value;
}

async function signPath(path: string): Promise<string | null> {
  try {
    return await signedFileUrl(path);
  } catch (error) {
    logger.error(`Fayl havolasini imzolab bo'lmadi: ${path}`, error as Error);
    return null;
  }
}

export async function expandFileUrls(value: unknown): Promise<unknown> {
  const paths = new Set<string>();
  collectPaths(value, paths);
  if (!paths.size) return value;

  const entries = await Promise.all([...paths].map(async (path) => [path, await signPath(path)] as const));
  return replacePaths(value, new Map(entries));
}
