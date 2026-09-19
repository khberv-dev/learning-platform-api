import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Session } from '@/core/session/entity/session.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { isEnrollmentExpired } from '@/core/enrollment/utils/enrollment.util';
import { FirebaseService, PushPayload } from '@/core/notification/services/firebase.service';
import { PushAudience } from '@/core/notification/enum/push-audience.enum';
import { SendPushDto } from '@/core/notification/dto/send-push.dto';
import { UserNotification } from '@/core/notification/entity/user-notification.entity';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';
import { type AuthUser, ownerRef } from '@/common/utils/role-owner.util';
import { UserRole } from '@/core/user/enum/user-role.enum';
import {
  courseCreatedMessage,
  courseEnrolledMessage,
  lessonAddedMessage,
  mentorAssignedMessage,
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
    @InjectRepository(UserNotification) private readonly userNotificationRepo: Repository<UserNotification>,
    private readonly firebaseService: FirebaseService,
  ) {}

  async notifyCourseEnrolled(studentId: string, courseId: string, courseTitle: string): Promise<void> {
    const student: RoleId = { id: studentId, role: UserRole.STUDENT };
    const payload = courseEnrolledMessage(courseTitle, courseId);
    await this.savePermanent([student], payload);
    await this.send(await this.tokensOfUsers([student]), payload);
  }

  async notifyMentorAssigned(studentId: string, mentorName: string, assignmentId: string): Promise<void> {
    const student: RoleId = { id: studentId, role: UserRole.STUDENT };
    await this.send(await this.tokensOfUsers([student]), mentorAssignedMessage(mentorName, assignmentId));
  }

  async notifyCourseCreated(courseId: string, courseTitle: string): Promise<void> {
    await this.send(await this.tokensOfRole('student'), courseCreatedMessage(courseTitle, courseId));
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

  async findUserNotifications(user: RoleId, query: PaginationQuery): Promise<Paginated<UserNotification>> {
    const [data, total] = await this.userNotificationRepo.findAndCount({
      where: ownerRef(user),
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async findUnreadUserNotifications(user: RoleId, query: PaginationQuery): Promise<Paginated<UserNotification>> {
    const [data, total] = await this.userNotificationRepo.findAndCount({
      where: { ...ownerRef(user), isRead: false },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async markUserNotificationAsRead(user: RoleId, notificationId: string): Promise<UserNotification> {
    const notification = await this.userNotificationRepo.findOne({
      where: { id: notificationId, ...ownerRef(user) },
    });
    if (!notification) throw new NotFoundException('Xabarnoma topilmadi');

    if (!notification.isRead) {
      notification.isRead = true;
      await this.userNotificationRepo.save(notification);
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
      where: [{ student: { phoneNumber: In(unique) } }, { mentor: { phoneNumber: In(unique) } }],
      relations: { student: true, mentor: true },
      select: { student: { phoneNumber: true }, mentor: { phoneNumber: true } },
    });
    const reached = new Set(reachedRows.map((row) => row.student?.phoneNumber ?? row.mentor?.phoneNumber));

    return {
      users,
      tokens,
      notFound: unique.filter((phone) => !known.has(phone)),
      withoutDevice: unique.filter((phone) => known.has(phone) && !reached.has(phone)),
    };
  }

  private async savePermanent(users: RoleId[], payload: PushPayload): Promise<void> {
    if (users.length === 0) return;
    try {
      await this.userNotificationRepo.insert(
        users.map((user) => ({
          ...ownerRef(user),
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
    const mentorIds = users.filter((u) => u.role === UserRole.MENTOR).map((u) => u.id);
    const adminIds = users.filter((u) => u.role === UserRole.ADMIN).map((u) => u.id);
    if (studentIds.length === 0 && mentorIds.length === 0 && adminIds.length === 0) return [];

    const where = [
      ...(studentIds.length ? [{ student: { id: In(studentIds) } }] : []),
      ...(mentorIds.length ? [{ mentor: { id: In(mentorIds) } }] : []),
      ...(adminIds.length ? [{ admin: { id: In(adminIds) } }] : []),
    ];
    const sessions = await this.sessionRepo.find({ where, select: { fcmToken: true } });
    return sessions.map((session) => session.fcmToken);
  }

  private async tokensOfRole(role: 'student' | 'mentor'): Promise<string[]> {
    const sessions = await this.sessionRepo.find({
      where: { [role]: Not(IsNull()) },
      select: { fcmToken: true },
    });
    return sessions.map((session) => session.fcmToken);
  }

  private async tokensOfCourseStudents(courseId: string): Promise<string[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: { course: { id: courseId }, status: EnrollmentStatus.ACTIVE },
      relations: { student: true },
    });

    const now = new Date();
    const studentIds = enrollments
      .filter((enrollment) => !isEnrollmentExpired(enrollment, now))
      .map((enrollment) => enrollment.student.id);

    return this.tokensOfUsers([...new Set(studentIds)].map((id) => ({ id, role: UserRole.STUDENT })));
  }
}
