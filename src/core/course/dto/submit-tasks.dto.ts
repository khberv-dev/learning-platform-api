import { BadRequestException } from '@nestjs/common';

/** `{ [taskId]: string[] }` — har bir savolga bitta javob, savollar tartibida. */
export type SubmitTasksBody = Record<string, string[]>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * So'rov tanasi kalitlari dinamik (topshiriq id'lari) bo'lgani uchun uni
 * class-validator bilan tekshirib bo'lmaydi — global `ValidationPipe` bunday
 * turga metadata topa olmaydi va tekshiruvsiz o'tkazib yuboradi. Shuning uchun
 * qo'lda tekshiriladi: aks holda noto'g'ri tana 500 xatosiga olib kelardi.
 */
export function parseSubmitTasksBody(body: unknown): SubmitTasksBody {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException("So'rov tanasi { taskId: [javoblar] } ko'rinishida bo'lishi kerak");
  }

  const entries = Object.entries(body as Record<string, unknown>);
  if (entries.length === 0) {
    throw new BadRequestException('Kamida bitta topshiriq javobi yuborilishi kerak');
  }

  const parsed: SubmitTasksBody = {};

  for (const [taskId, answers] of entries) {
    if (!UUID_RE.test(taskId)) {
      throw new BadRequestException(`Topshiriq id noto'g'ri: ${taskId}`);
    }
    if (!Array.isArray(answers)) {
      throw new BadRequestException(`Javoblar ro'yxat bo'lishi kerak: ${taskId}`);
    }
    if (!answers.every((a) => typeof a === 'string')) {
      throw new BadRequestException(`Javoblar faqat matn bo'lishi kerak: ${taskId}`);
    }
    parsed[taskId] = answers;
  }

  return parsed;
}
