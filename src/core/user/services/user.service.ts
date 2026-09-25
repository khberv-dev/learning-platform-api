import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { StudentLevel } from '@/core/user/enum/student-level.enum';
import { Gender } from '@/core/user/enum/gender.enum';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { StudentActivity } from '@/core/user/entity/student-activity.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { UserRole } from '@/core/user/enum/user-role.enum';
import type { AuthUser } from '@/common/utils/role-owner.util';
import { hashPassword } from '@/shared/utils/hash.util';

type RoleId = Pick<AuthUser, 'id' | 'role'>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
    @InjectRepository(StudentActivity) private readonly studentActivityRepo: Repository<StudentActivity>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
  ) {}

  private repoFor(role: UserRole): Repository<Student> | Repository<Mentor> | Repository<Admin> {
    switch (role) {
      case UserRole.STUDENT:
        return this.studentRepo;
      case UserRole.MENTOR:
        return this.mentorRepo;
      case UserRole.ADMIN:
        return this.adminRepo;
    }
  }

  private toAuthUser(role: UserRole, account: Student | Mentor | Admin): AuthUser {
    return {
      id: account.id,
      role,
      firstName: account.firstName,
      lastName: account.lastName ?? null,
      avatar: account.avatar ?? null,
      email: 'email' in account ? (account.email ?? null) : null,
      phoneNumber: 'phoneNumber' in account ? (account.phoneNumber ?? null) : null,
      isActive: account.isActive,
    };
  }

  async findAuthUser(id: string, role: UserRole): Promise<AuthUser | null> {
    const account = await this.repoFor(role).findOne({ where: { id } });
    if (!account) return null;
    return this.toAuthUser(role, account);
  }

  private utcDate(date = new Date()): string {
    return date.toISOString().slice(0, 10);
  }

  private async hasActiveCourse(studentId: string): Promise<boolean> {
    return this.enrollmentRepo.exists({
      where: { student: { id: studentId }, status: EnrollmentStatus.ACTIVE },
    });
  }

  async recordDailyActivity(
    studentId: string,
  ): Promise<{ activityDate: string; hasCourse: boolean; recorded: boolean }> {
    const activityDate = this.utcDate();
    const hasCourse = await this.hasActiveCourse(studentId);
    const rows: Array<{ inserted: boolean }> = await this.studentActivityRepo.query(
      `INSERT INTO activities (student_id, activity_date, has_course)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, activity_date) DO UPDATE SET has_course = TRUE
         WHERE activities.has_course = FALSE AND EXCLUDED.has_course = TRUE
       RETURNING (xmax = 0) AS inserted`,
      [studentId, activityDate, hasCourse],
    );
    return { activityDate, hasCourse, recorded: rows.some((row) => row.inserted) };
  }

  async getStreak(studentId: string) {
    const rows = await this.studentActivityRepo.find({
      where: { student: { id: studentId } },
      select: { activityDate: true },
      order: { activityDate: 'DESC' },
    });
    const dates = rows.map((row) => row.activityDate);
    if (dates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0, activeToday: false, lastActiveDate: null };
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const toDay = (date: string) => Date.parse(`${date}T00:00:00.000Z`) / dayMs;
    const today = toDay(this.utcDate());
    const days = dates.map(toDay);

    let longestStreak = 1;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
      if (days[i - 1] - days[i] === 1) {
        run++;
        longestStreak = Math.max(longestStreak, run);
      } else {
        run = 1;
      }
    }

    let currentStreak = 0;
    if (days[0] === today || days[0] === today - 1) {
      currentStreak = 1;
      for (let i = 1; i < days.length && days[i - 1] - days[i] === 1; i++) currentStreak++;
    }

    return {
      currentStreak,
      longestStreak,
      totalActiveDays: dates.length,
      activeToday: days[0] === today,
      lastActiveDate: dates[0],
    };
  }

  async updateAvatar(user: RoleId, avatarPath: string): Promise<AuthUser> {
    await this.repoFor(user.role).update(user.id, { avatar: avatarPath });
    return (await this.findAuthUser(user.id, user.role))!;
  }

  async setPassword(id: string, password: string): Promise<void> {
    for (const repo of [this.studentRepo, this.mentorRepo, this.adminRepo]) {
      const exists = await repo.existsBy({ id });
      if (exists) {
        await repo.update(id, { password: await hashPassword(password) });
        return;
      }
    }
    throw new NotFoundException('Foydalanuvchi topilmadi');
  }

  async findAccountForAuth(identity: {
    email?: string;
    phoneNumber?: string;
  }): Promise<{ id: string; role: UserRole; password: string; isActive: boolean } | null> {
    const candidates = identity.email
      ? ([
          [UserRole.STUDENT, this.studentRepo],
          [UserRole.ADMIN, this.adminRepo],
        ] as const)
      : ([
          [UserRole.STUDENT, this.studentRepo],
          [UserRole.MENTOR, this.mentorRepo],
        ] as const);

    const where = identity.email ? 'LOWER(account.email) = :email' : 'account.phoneNumber = :phoneNumber';
    const params = identity.email ? { email: identity.email.toLowerCase() } : { phoneNumber: identity.phoneNumber };

    for (const [role, repo] of candidates) {
      const account = await repo
        .createQueryBuilder('account')
        .addSelect('account.password')
        .where(where, params)
        .getOne();
      if (account) return { id: account.id, role, password: account.password, isActive: account.isActive };
    }
    return null;
  }

  private async accountForAuthByField<T extends { id: string; password: string; isActive: boolean }>(
    repo: Repository<T>,
    alias: string,
    where: string,
    params: Record<string, unknown>,
  ): Promise<{ id: string; password: string; isActive: boolean } | null> {
    const account = await repo.createQueryBuilder(alias).addSelect(`${alias}.password`).where(where, params).getOne();
    return account ? { id: account.id, password: account.password, isActive: account.isActive } : null;
  }

  findStudentForAuth(identity: {
    email?: string;
    phoneNumber?: string;
  }): Promise<{ id: string; password: string; isActive: boolean } | null> {
    const where = identity.email ? 'LOWER(student.email) = :email' : 'student.phoneNumber = :phoneNumber';
    const params = identity.email ? { email: identity.email.toLowerCase() } : { phoneNumber: identity.phoneNumber };
    return this.accountForAuthByField(this.studentRepo, 'student', where, params);
  }

  findMentorForAuth(phoneNumber: string): Promise<{ id: string; password: string; isActive: boolean } | null> {
    return this.accountForAuthByField(this.mentorRepo, 'mentor', 'mentor.phoneNumber = :phoneNumber', {
      phoneNumber,
    });
  }

  findAdminForAuth(email: string): Promise<{ id: string; password: string; isActive: boolean } | null> {
    return this.accountForAuthByField(this.adminRepo, 'admin', 'LOWER(admin.email) = :email', {
      email: email.toLowerCase(),
    });
  }

  hasStudentProfile(phoneNumber: string): Promise<boolean> {
    return this.studentRepo.existsBy({ phoneNumber });
  }

  async hasStudentProfileByEmail(email: string): Promise<boolean> {
    const count = await this.studentRepo
      .createQueryBuilder('student')
      .where('LOWER(student.email) = :email', { email: email.toLowerCase() })
      .getCount();
    return count > 0;
  }

  createStudent(data: {
    firstName: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    password: string;
    level?: StudentLevel;
    gender?: Gender;
  }): Promise<Student> {
    return this.studentRepo.save({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      password: data.password,
      ...(data.level ? { level: data.level } : {}),
      ...(data.gender ? { gender: data.gender } : {}),
    });
  }
}
