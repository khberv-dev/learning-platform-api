import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Session } from '@/core/session/entity/session.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { isEnrollmentExpired } from '@/core/enrollment/utils/enrollment.util';
import { FirebaseService, PushPayload } from '@/core/notification/services/firebase.service';
import {
  courseCreatedMessage,
  courseEnrolledMessage,
  lessonAddedMessage,
  teacherAssignedMessage,
} from '@/core/notification/utils/push-message.util';

/**
 * Hodisa bo'yicha push xabarnoma yuboradi: kimga yuborilishini shu yerda
 * hal qiladi, yuborishning o'zini `FirebaseService` bajaradi.
 *
 * Barcha metodlar xatoni yutadi va hech qachon otmaydi — xabarnoma yuborilmagani
 * yozilish, to'lov yoki dars qo'shishni buzmasligi kerak. Chaqiruvchi shuning
 * uchun natijani kutmasa ham bo'ladi (`void`).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    private readonly firebaseService: FirebaseService,
  ) {}

  /** Talaba kursga yozildi — o'sha talabaning qurilmalariga. */
  async notifyCourseEnrolled(userId: string, courseId: string, courseTitle: string): Promise<void> {
    await this.send(await this.tokensOfUsers([userId]), courseEnrolledMessage(courseTitle, courseId));
  }

  /** Talabaga mentor tayinlandi — talabaning qurilmalariga. */
  async notifyTeacherAssigned(studentUserId: string, teacherName: string, assignmentId: string): Promise<void> {
    await this.send(await this.tokensOfUsers([studentUserId]), teacherAssignedMessage(teacherName, assignmentId));
  }

  /** Admin yangi kurs qo'shdi — barcha talabalarga. */
  async notifyCourseCreated(courseId: string, courseTitle: string): Promise<void> {
    await this.send(await this.tokensOfAllStudents(), courseCreatedMessage(courseTitle, courseId));
  }

  /** Kursga yangi dars qo'shildi — faqat o'sha kursga yozilgan talabalarga. */
  async notifyLessonAdded(courseId: string, courseTitle: string, lessonTitle: string): Promise<void> {
    const tokens = await this.tokensOfCourseStudents(courseId);
    await this.send(tokens, lessonAddedMessage(courseTitle, lessonTitle, courseId));
  }

  private async send(tokens: string[], payload: PushPayload): Promise<void> {
    if (tokens.length === 0) return;

    try {
      const result = await this.firebaseService.sendToTokens(tokens, payload);

      // Ro'yxatdan o'tmagan tokenlar bazada qolib ketmasin — ilova o'chirilgan
      // yoki token yangilangan qurilmalar sessiyasi tozalanadi.
      if (result.deadTokens.length > 0) {
        await this.sessionRepo.delete({ fcmToken: In(result.deadTokens) });
      }

      this.logger.log(
        `Push "${payload.title}": ${result.sent} yuborildi, ${result.failed} xato, ` +
          `${result.deadTokens.length} eskirgan token o'chirildi`,
      );
    } catch (error) {
      this.logger.error(`Push yuborishda kutilmagan xato: ${payload.title}`, error as Error);
    }
  }

  private async tokensOfUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const sessions = await this.sessionRepo.find({
      where: { user: { id: In(userIds) } },
      select: { fcmToken: true },
    });
    return sessions.map((session) => session.fcmToken);
  }

  /** Talaba profili bor foydalanuvchilarning barcha qurilmalari. */
  private async tokensOfAllStudents(): Promise<string[]> {
    const rows = await this.sessionRepo
      .createQueryBuilder('session')
      .select('session.fcm_token', 'fcmToken')
      .innerJoin('students', 'student', 'student.user_id = session.user_id')
      .getRawMany<{ fcmToken: string }>();
    return rows.map((row) => row.fcmToken);
  }

  /** Kursga muddati tugamagan faol yozilishi bor talabalar. */
  private async tokensOfCourseStudents(courseId: string): Promise<string[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: { course: { id: courseId }, status: EnrollmentStatus.ACTIVE },
      relations: { student: { user: true } },
    });

    const now = new Date();
    const userIds = enrollments
      .filter((enrollment) => !isEnrollmentExpired(enrollment, now))
      .map((enrollment) => enrollment.student.user.id);

    return this.tokensOfUsers([...new Set(userIds)]);
  }
}
