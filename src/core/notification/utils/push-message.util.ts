import { PushPayload } from '@/core/notification/services/firebase.service';

/**
 * Push xabarnoma hodisalari. Kod `data.event` sifatida qurilmaga yuboriladi —
 * ilova shu bo'yicha qaysi ekranga o'tishni hal qiladi.
 */
export enum PushEvent {
  COURSE_ENROLLED = 'course_enrolled',
  TEACHER_ASSIGNED = 'teacher_assigned',
  COURSE_CREATED = 'course_created',
  LESSON_ADDED = 'lesson_added',
  /** Admin qo'lda yozgan xabar — matni shu yerda emas, so'rovda keladi. */
  ADMIN_MESSAGE = 'admin_message',
}

/**
 * Barcha xabarnoma matnlari shu yerda — tarjimani bir joydan o'qib chiqish
 * va o'zgartirish uchun. Matnlar o'zbek tilida, foydalanuvchiga ko'rinadi.
 */
export function courseEnrolledMessage(courseTitle: string, courseId: string): PushPayload {
  return {
    title: 'Kursga yozildingiz',
    body: `«${courseTitle}» kursiga muvaffaqiyatli yozildingiz. Darslarni boshlashingiz mumkin.`,
    data: { event: PushEvent.COURSE_ENROLLED, courseId },
  };
}

export function teacherAssignedMessage(teacherName: string, assignmentId: string): PushPayload {
  return {
    title: 'Mentor tayinlandi',
    body: `${teacherName} sizga mentor sifatida tayinlandi. Suhbatni boshlashingiz mumkin.`,
    data: { event: PushEvent.TEACHER_ASSIGNED, assignmentId },
  };
}

export function courseCreatedMessage(courseTitle: string, courseId: string): PushPayload {
  return {
    title: 'Yangi kurs',
    body: `«${courseTitle}» kursi qo'shildi. Tanishib chiqing!`,
    data: { event: PushEvent.COURSE_CREATED, courseId },
  };
}

export function lessonAddedMessage(courseTitle: string, lessonTitle: string, courseId: string): PushPayload {
  return {
    title: 'Yangi dars',
    body: `«${courseTitle}» kursiga yangi dars qo'shildi: «${lessonTitle}».`,
    data: { event: PushEvent.LESSON_ADDED, courseId },
  };
}
