import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type WeekDay = (typeof VALID_DAYS)[number];

export function validateScheduleShape(
  schedule: Record<string, string[]>,
): string | null {
  for (const day of Object.keys(schedule)) {
    if (!VALID_DAYS.includes(day as WeekDay)) {
      return `Noto'g'ri kun: ${day}. Qabul qilinadiganlar: ${VALID_DAYS.join(', ')}`;
    }
    const slots = schedule[day];
    if (!Array.isArray(slots)) return `${day} uchun vaqtlar massiv bo'lishi kerak`;
    for (const t of slots) {
      if (!/^\d{2}:\d{2}$/.test(t)) return `Noto'g'ri vaqt formati: ${t}. Format: HH:MM`;
      const [hStr, mStr] = t.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (h < 0 || h > 23) return `Soat chegaradan tashqari: ${t}`;
      if (m !== 0 && m !== 30) return `Vaqt 30 daqiqalik intervallarda bo'lishi kerak (HH:00 yoki HH:30): ${t}`;
    }
    if (new Set(slots).size !== slots.length) return `${day} da takrorlanuvchi vaqtlar mavjud`;
  }
  return null;
}

export function countScheduleSlots(schedule: Record<string, string[]>): number {
  return Object.values(schedule).reduce((sum, slots) => sum + slots.length, 0);
}

export class SetScheduleDto {
  @ApiProperty({
    example: { Mon: ['10:00', '10:30'], Wed: ['14:00'], Fri: ['09:00', '09:30'] },
    description: 'Haftalik jadval. Kalitlar: Mon-Sun. Qiymatlar: HH:00 yoki HH:30 formatidagi vaqtlar.',
  })
  @IsObject()
  schedule: Record<string, string[]>;
}
