import { PushPayload } from '@/core/notification/services/firebase.service';

export enum PushEvent {
  COURSE_ENROLLED = 'course_enrolled',
  MENTOR_ASSIGNED = 'mentor_assigned',
  COURSE_CREATED = 'course_created',
  LESSON_ADDED = 'lesson_added',
  ADMIN_MESSAGE = 'admin_message',
}

export function courseEnrolledMessage(courseTitle: string, courseId: string): PushPayload {
  return {
    title: 'Kursga yozildingiz',
    body: `«${courseTitle}» kursiga muvaffaqiyatli yozildingiz. Darslarni boshlashingiz mumkin.`,
    data: { event: PushEvent.COURSE_ENROLLED, courseId },
  };
}

export function mentorAssignedMessage(mentorName: string, assignmentId: string): PushPayload {
  return {
    title: 'Mentor tayinlandi',
    body: `${mentorName} sizga mentor sifatida tayinlandi. Suhbatni boshlashingiz mumkin.`,
    data: { event: PushEvent.MENTOR_ASSIGNED, assignmentId },
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
