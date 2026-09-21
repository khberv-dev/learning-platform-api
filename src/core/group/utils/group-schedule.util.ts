const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type WeekDay = (typeof VALID_DAYS)[number];

export function validateGroupScheduleShape(schedule: Record<string, string[]>): string | null {
  for (const day of Object.keys(schedule)) {
    if (!VALID_DAYS.includes(day as WeekDay)) {
      return `Noto'g'ri kun: ${day}. Qabul qilinadiganlar: ${VALID_DAYS.join(', ')}`;
    }
    const times = schedule[day];
    if (!Array.isArray(times)) return `${day} uchun vaqtlar massiv bo'lishi kerak`;
    for (const t of times) {
      if (typeof t !== 'string' || t.trim().length === 0) return `${day} uchun vaqt bo'sh bo'lmasligi kerak`;
    }
  }
  return null;
}
