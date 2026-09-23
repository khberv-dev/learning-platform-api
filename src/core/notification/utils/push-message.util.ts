import { PushPayload } from '@/core/notification/services/firebase.service';

export enum PushEvent {
  COURSE_ENROLLED = 'course_enrolled',
  COURSE_CREATED = 'course_created',
  LESSON_ADDED = 'lesson_added',
  GROUP_JOINED = 'group_joined',
  LIVE_LESSON_CREATED = 'live_lesson_created',
  ADMIN_MESSAGE = 'admin_message',
}

export function courseEnrolledMessage(courseTitle: string, courseId: string): PushPayload {
  return {
    title: 'Kursga yozildingiz',
    body: `«${courseTitle}» kursiga muvaffaqiyatli yozildingiz. Darslarni boshlashingiz mumkin.`,
    data: { event: PushEvent.COURSE_ENROLLED, courseId },
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

export function groupJoinedMessage(groupTitle: string, groupId: string): PushPayload {
  return {
    title: "Guruhga qo'shildingiz",
    body: `Siz «${groupTitle}» guruhiga qo'shildingiz.`,
    data: { event: PushEvent.GROUP_JOINED, groupId },
  };
}

export function liveLessonCreatedMessage(lessonName: string, groupTitle: string, groupId: string): PushPayload {
  return {
    title: 'Jonli dars boshlandi',
    body: `«${groupTitle}» guruhi uchun «${lessonName}» jonli darsi boshlandi.`,
    data: { event: PushEvent.LIVE_LESSON_CREATED, groupId },
  };
}
