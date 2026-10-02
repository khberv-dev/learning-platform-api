export const ASSIGNMENT_WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type AssignmentWeekday = (typeof ASSIGNMENT_WEEKDAYS)[number];
export type AssignmentSchedule = Partial<Record<AssignmentWeekday, string>>[];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateAssignmentSchedule(schedule: unknown): string | null {
  if (!Array.isArray(schedule) || schedule.length === 0) return "Jadval bo'sh bo'lmagan massiv bo'lishi kerak";

  for (const slot of schedule) {
    if (typeof slot !== 'object' || slot === null || Array.isArray(slot)) {
      return "Jadval elementi { kun: 'HH:mm' } ko'rinishidagi obyekt bo'lishi kerak";
    }
    const entries = Object.entries(slot as Record<string, unknown>);
    if (entries.length === 0) return "Jadval elementi bo'sh bo'lmasligi kerak";

    for (const [day, time] of entries) {
      if (!ASSIGNMENT_WEEKDAYS.includes(day as AssignmentWeekday)) {
        return `Noto'g'ri kun: ${day}. Qabul qilinadiganlar: ${ASSIGNMENT_WEEKDAYS.join(', ')}`;
      }
      if (typeof time !== 'string' || !TIME_RE.test(time)) {
        return `${day} uchun vaqt HH:mm formatida bo'lishi kerak`;
      }
    }
  }
  return null;
}
