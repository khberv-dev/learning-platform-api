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

export function expandFileUrls(value: unknown, getBaseUrl: () => string, depth = 0): unknown {
  if (depth > MAX_DEPTH || value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (!UPLOAD_PATH_RE.test(value)) return value;
    return `${getBaseUrl()}/public/${value.replace(/^\/+/, '')}`;
  }
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => expandFileUrls(item, getBaseUrl, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        expandFileUrls(item, getBaseUrl, depth + 1),
      ]),
    );
  }
  return value;
}
