import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Session } from '@/core/session/entity/session.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { FirebaseService, PushPayload } from '@/core/notification/services/firebase.service';
import { PushAudience } from '@/core/notification/enum/push-audience.enum';
import { SendPushDto } from '@/core/notification/dto/send-push.dto';
import { StudentNotification } from '@/core/notification/entity/student-notification.entity';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';
import type { AuthUser } from '@/common/utils/role-owner.util';
import { UserRole } from '@/core/user/enum/user-role.enum';
import {
  courseCreatedMessage,
  courseEnrolledMessage,
  groupJoinedMessage,
  lessonAddedMessage,
  liveLessonCreatedMessage,
  PushEvent,
} from '@/core/notification/utils/push-message.util';

type RoleId = Pick<AuthUser, 'id' | 'role'>;

interface PushDeliveryReport {
  devices: number;
  sent: number;
  failed: number;
  removedTokens: number;
}

export interface ManualPushResult extends PushDeliveryReport {
  audience: PushAudience;
  notFound?: string[];
  withoutDevice?: string[];
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(StudentNotification) private readonly studentNotificationRepo: Repository<StudentNotification>,
    private readonly firebaseService: FirebaseService,
  ) {}

  async notifyCourseEnrolled(studentId: string, courseId: string, courseTitle: string): Promise<void> {
    const student: RoleId = { id: studentId, role: UserRole.STUDENT };
    const payload = courseEnrolledMessage(courseTitle, courseId);
    await this.savePermanent([student], payload);
    await this.send(await this.tokensOfUsers([student]), payload);
  }

  async notifyGroupJoined(studentId: string, groupTitle: string, groupId: string): Promise<void> {
    const student: RoleId = { id: studentId, role: UserRole.STUDENT };
    const payload = groupJoinedMessage(groupTitle, groupId);
    await this.savePermanent([student], payload);
    await this.send(await this.tokensOfUsers([student]), payload);
  }

  async notifyLiveLessonCreated(groupId: string, groupTitle: string, lessonName: string): Promise<void> {
    const students = await this.studentRepo.find({ where: { group: { id: groupId } }, select: { id: true } });
    if (students.length === 0) return;

    const roleIds: RoleId[] = students.map((s) => ({ id: s.id, role: UserRole.STUDENT }));
    const payload = liveLessonCreatedMessage(lessonName, groupTitle, groupId);
    await this.savePermanent(roleIds, payload);
    await this.send(await this.tokensOfUsers(roleIds), payload);
  }

  async notifyCourseCreated(courseId: string, courseTitle: string): Promise<void> {
    await this.send(await this.tokensOfAllStudents(), courseCreatedMessage(courseTitle, courseId));
  }

  async notifyLessonAdded(courseId: string, courseTitle: string, lessonTitle: string): Promise<void> {
    const tokens = await this.tokensOfCourseStudents(courseId);
    await this.send(tokens, lessonAddedMessage(courseTitle, lessonTitle, courseId));
  }

  async sendManual(dto: SendPushDto): Promise<ManualPushResult> {
    const payload: PushPayload = { title: dto.title, body: dto.body, data: { event: PushEvent.ADMIN_MESSAGE } };

    if (dto.audience !== PushAudience.PHONES) {
      const users = await this.usersOfAudience(dto.audience);
      if (dto.isPermanent) await this.savePermanent(users, payload);
      const tokens = await this.tokensOfUsers(users);
      return { audience: dto.audience, ...(await this.deliver(tokens, payload)) };
    }

    const { users, tokens, notFound, withoutDevice } = await this.resolvePhones(dto.phoneNumbers ?? []);
    if (dto.isPermanent) await this.savePermanent(users, payload);
    return { audience: dto.audience, ...(await this.deliver(tokens, payload)), notFound, withoutDevice };
  }

  async findUserNotifications(studentId: string, query: PaginationQuery): Promise<Paginated<StudentNotification>> {
    const [data, total] = await this.studentNotificationRepo.findAndCount({
      where: { student: { id: studentId } },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async findUnreadUserNotifications(
    studentId: string,
    query: PaginationQuery,
  ): Promise<Paginated<StudentNotification>> {
    const [data, total] = await this.studentNotificationRepo.findAndCount({
      where: { student: { id: studentId }, isRead: false },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async markUserNotificationAsRead(studentId: string, notificationId: string): Promise<StudentNotification> {
    const notification = await this.studentNotificationRepo.findOne({
      where: { id: notificationId, student: { id: studentId } },
    });
    if (!notification) throw new NotFoundException('Xabarnoma topilmadi');

    if (!notification.isRead) {
      notification.isRead = true;
      await this.studentNotificationRepo.save(notification);
    }
    return notification;
  }

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

  private async usersOfAudience(audience: Exclude<PushAudience, PushAudience.PHONES>): Promise<RoleId[]> {
    if (audience === PushAudience.ALL) {
      const [students, mentors] = await Promise.all([
        this.studentRepo.find({ select: { id: true } }),
        this.mentorRepo.find({ select: { id: true } }),
      ]);
      return [
        ...students.map((s) => ({ id: s.id, role: UserRole.STUDENT })),
        ...mentors.map((m) => ({ id: m.id, role: UserRole.MENTOR })),
      ];
    }
    if (audience === PushAudience.STUDENTS) {
      const rows = await this.studentRepo.find({ select: { id: true } });
      return rows.map((row) => ({ id: row.id, role: UserRole.STUDENT }));
    }
    const rows = await this.mentorRepo.find({ select: { id: true } });
    return rows.map((row) => ({ id: row.id, role: UserRole.MENTOR }));
  }

  private async resolvePhones(
    phoneNumbers: string[],
  ): Promise<{ users: RoleId[]; tokens: string[]; notFound: string[]; withoutDevice: string[] }> {
    const unique = [...new Set(phoneNumbers)];
    if (unique.length === 0) return { users: [], tokens: [], notFound: [], withoutDevice: [] };

    const [students, mentors] = await Promise.all([
      this.studentRepo.find({ where: { phoneNumber: In(unique) }, select: { id: true, phoneNumber: true } }),
      this.mentorRepo.find({ where: { phoneNumber: In(unique) }, select: { id: true, phoneNumber: true } }),
    ]);
    const users: RoleId[] = [
      ...students.map((s) => ({ id: s.id, role: UserRole.STUDENT })),
      ...mentors.map((m) => ({ id: m.id, role: UserRole.MENTOR })),
    ];
    const known = new Set([...students.map((s) => s.phoneNumber), ...mentors.map((m) => m.phoneNumber)]);

    const tokens = await this.tokensOfUsers(users);
    const reachedRows = await this.sessionRepo.find({
      where: { student: { phoneNumber: In(unique) } },
      relations: { student: true },
      select: { student: { phoneNumber: true } },
    });
    const reached = new Set(reachedRows.map((row) => row.student.phoneNumber));

    return {
      users,
      tokens,
      notFound: unique.filter((phone) => !known.has(phone)),
      withoutDevice: unique.filter((phone) => known.has(phone) && !reached.has(phone)),
    };
  }

  private async savePermanent(users: RoleId[], payload: PushPayload): Promise<void> {
    const studentIds = users.filter((u) => u.role === UserRole.STUDENT).map((u) => u.id);
    if (studentIds.length === 0) return;
    try {
      await this.studentNotificationRepo.insert(
        studentIds.map((studentId) => ({
          student: { id: studentId },
          title: payload.title,
          body: payload.body,
          data: payload.data ?? null,
        })),
      );
    } catch (error) {
      this.logger.error(`Doimiy xabarnomani saqlashda xato: ${payload.title}`, error as Error);
    }
  }

  private async send(tokens: string[], payload: PushPayload): Promise<void> {
    if (tokens.length === 0) return;

    try {
      const result = await this.firebaseService.sendToTokens(tokens, payload);

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

  private async tokensOfUsers(users: RoleId[]): Promise<string[]> {
    const studentIds = users.filter((u) => u.role === UserRole.STUDENT).map((u) => u.id);
    if (studentIds.length === 0) return [];

    const sessions = await this.sessionRepo.find({
      where: { student: { id: In(studentIds) } },
      select: { fcmToken: true },
    });
    return sessions.map((session) => session.fcmToken);
  }

  private async tokensOfAllStudents(): Promise<string[]> {
    const sessions = await this.sessionRepo.find({ select: { fcmToken: true } });
    return sessions.map((session) => session.fcmToken);
  }

  private async tokensOfCourseStudents(courseId: string): Promise<string[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: { course: { id: courseId }, status: EnrollmentStatus.ACTIVE },
      relations: { student: true },
    });

    const studentIds = enrollments.map((enrollment) => enrollment.student.id);

    return this.tokensOfUsers([...new Set(studentIds)].map((id) => ({ id, role: UserRole.STUDENT })));
  }
}
