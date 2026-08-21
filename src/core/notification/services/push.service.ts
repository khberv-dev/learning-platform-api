import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Session } from '@/core/session/entity/session.entity';
import { User } from '@/core/user/entity/user.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { isEnrollmentExpired } from '@/core/enrollment/utils/enrollment.util';
import { FirebaseService, PushPayload } from '@/core/notification/services/firebase.service';
import { PushAudience } from '@/core/notification/enum/push-audience.enum';
import { SendPushDto } from '@/core/notification/dto/send-push.dto';
import {
  courseCreatedMessage,
  courseEnrolledMessage,
  lessonAddedMessage,
  PushEvent,
  teacherAssignedMessage,
} from '@/core/notification/utils/push-message.util';

interface PushDeliveryReport {
  /** Xabar yuborilgan qurilmalar soni. */
  devices: number;
  sent: number;
  failed: number;
  /** FCM yaroqsiz deb qaytargan va bazadan o'chirilgan tokenlar soni. */
  removedTokens: number;
}

export interface ManualPushResult extends PushDeliveryReport {
  audience: PushAudience;
  /** Faqat `phones` uchun: bunday foydalanuvchi topilmadi. */
  notFound?: string[];
  /** Faqat `phones` uchun: foydalanuvchi bor, lekin ilovada sessiyasi yo'q. */
  withoutDevice?: string[];
}

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
    @InjectRepository(User) private readonly userRepo: Repository<User>,
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

  /**
   * Admin qo'lda yuboradigan xabarnoma.
   *
   * Hodisa metodlaridan farqli o'laroq natijani qaytaradi — admin panelga
   * nechta qurilmaga borgani va qaysi raqamlar topilmagani ko'rsatiladi.
   * Yuborish so'rov ichida bajariladi, shuning uchun javob kutiladi.
   */
  async sendManual(dto: SendPushDto): Promise<ManualPushResult> {
    const payload: PushPayload = { title: dto.title, body: dto.body, data: { event: PushEvent.ADMIN_MESSAGE } };

    if (dto.audience !== PushAudience.PHONES) {
      const tokens = await this.tokensOfAudience(dto.audience);
      return { audience: dto.audience, ...(await this.deliver(tokens, payload)) };
    }

    const { tokens, notFound, withoutDevice } = await this.resolvePhones(dto.phoneNumbers ?? []);
    return { audience: dto.audience, ...(await this.deliver(tokens, payload)), notFound, withoutDevice };
  }

  /** Yuboradi, eskirgan tokenlarni tozalaydi va hisobotni qaytaradi. */
  private async deliver(tokens: string[], payload: PushPayload): Promise<PushDeliveryReport> {
    if (tokens.length === 0) return { devices: 0, sent: 0, failed: 0, removedTokens: 0 };

    const result = await this.firebaseService.sendToTokens(tokens, payload);
    if (result.deadTokens.length > 0) {
      await this.sessionRepo.delete({ fcmToken: In(result.deadTokens) });
    }

    this.logger.log(
      `Qo'lda push "${payload.title}": ${tokens.length} qurilma, ${result.sent} yuborildi, ` +
        `${result.failed} xato, ${result.deadTokens.length} eskirgan token o'chirildi`,
    );

    return {
      devices: tokens.length,
      sent: result.sent,
      failed: result.failed,
      removedTokens: result.deadTokens.length,
    };
  }

  private tokensOfAudience(audience: Exclude<PushAudience, PushAudience.PHONES>): Promise<string[]> {
    if (audience === PushAudience.ALL) {
      return this.sessionRepo.find({ select: { fcmToken: true } }).then((rows) => rows.map((row) => row.fcmToken));
    }
    return this.tokensOfRole(audience === PushAudience.STUDENTS ? 'students' : 'teachers');
  }

  /**
   * Raqamlar bo'yicha tokenlar. Yetib bormagan raqamlar ikki sababga bo'linadi,
   * chunki admin uchun farqi bor: `notFound` — bunday foydalanuvchi yo'q
   * (raqam xato), `withoutDevice` — foydalanuvchi bor, lekin ilovaga kirmagan.
   */
  private async resolvePhones(
    phoneNumbers: string[],
  ): Promise<{ tokens: string[]; notFound: string[]; withoutDevice: string[] }> {
    const unique = [...new Set(phoneNumbers)];
    if (unique.length === 0) return { tokens: [], notFound: [], withoutDevice: [] };

    const users = await this.userRepo.find({
      where: { phoneNumber: In(unique) },
      select: { id: true, phoneNumber: true },
    });
    const known = new Set(users.map((user) => user.phoneNumber));

    const rows = await this.sessionRepo
      .createQueryBuilder('session')
      .select('session.fcmToken', 'fcmToken')
      .addSelect('user.phoneNumber', 'phoneNumber')
      .innerJoin('session.user', 'user')
      .where('user.phoneNumber IN (:...phoneNumbers)', { phoneNumbers: unique })
      .getRawMany<{ fcmToken: string; phoneNumber: string }>();

    const reached = new Set(rows.map((row) => row.phoneNumber));

    return {
      tokens: rows.map((row) => row.fcmToken),
      notFound: unique.filter((phone) => !known.has(phone)),
      withoutDevice: unique.filter((phone) => known.has(phone) && !reached.has(phone)),
    };
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
  private tokensOfAllStudents(): Promise<string[]> {
    return this.tokensOfRole('students');
  }

  /** Berilgan rol jadvalida profili bor foydalanuvchilarning qurilmalari. */
  private async tokensOfRole(table: 'students' | 'teachers'): Promise<string[]> {
    const rows = await this.sessionRepo
      .createQueryBuilder('session')
      .select('session.fcm_token', 'fcmToken')
      .innerJoin(table, 'profile', 'profile.user_id = session.user_id')
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
