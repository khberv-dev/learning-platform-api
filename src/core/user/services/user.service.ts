import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Student, buildStudent } from '@/core/user/entity/student.entity';
import { StudentLevel } from '@/core/user/enum/student-level.enum';
import { Repository } from 'typeorm';
import { hashPassword } from '@/shared/utils/hash.util';
import { UserActivity } from '@/core/user/entity/user-activity.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { isEnrollmentExpired } from '@/core/enrollment/utils/enrollment.util';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserActivity) private readonly userActivityRepo: Repository<UserActivity>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
  ) {}

  private utcDate(date = new Date()): string {
    return date.toISOString().slice(0, 10);
  }

  /** Foydalanuvchida hozir faol va muddati tugamagan kurs yozilishi bormi. */
  private async hasActiveCourse(userId: string): Promise<boolean> {
    const enrollments = await this.enrollmentRepo.find({
      where: { student: { user: { id: userId } }, status: EnrollmentStatus.ACTIVE },
      select: { id: true, status: true, end: true },
    });
    return enrollments.some((enrollment) => !isEnrollmentExpired(enrollment));
  }

  /**
   * Foydalanuvchining bugungi (UTC) faolligini qayd etadi. `(user, activityDate)` unique bo'lgani uchun
   * bir kunda bir necha marta chaqirilsa ham bitta qator qoladi; `recorded` faqat birinchi chaqiruvda `true`.
   *
   * `hasCourse` — qayd etilgan paytda faol kursi bormi. Kun davomida kurs sotib olinsa, qator `true` ga
   * ko'tariladi, lekin hech qachon `false` ga tushirilmaydi: o'sha kuni kursi bo'lgan foydalanuvchi kursli sanaladi.
   */
  async recordDailyActivity(userId: string): Promise<{ activityDate: string; hasCourse: boolean; recorded: boolean }> {
    const activityDate = this.utcDate();
    const hasCourse = await this.hasActiveCourse(userId);
    // `xmax = 0` — qator shu so'rovda yangi qo'shilgan (yangilanmagan). O'zgarish bo'lmasa, qator qaytmaydi.
    const rows: Array<{ inserted: boolean }> = await this.userActivityRepo.query(
      `INSERT INTO user_activities (user_id, activity_date, has_course)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, activity_date) DO UPDATE SET has_course = TRUE
         WHERE user_activities.has_course = FALSE AND EXCLUDED.has_course = TRUE
       RETURNING (xmax = 0) AS inserted`,
      [userId, activityDate, hasCourse],
    );
    return { activityDate, hasCourse, recorded: rows.some((row) => row.inserted) };
  }

  async getStreak(userId: string) {
    const rows = await this.userActivityRepo.find({
      where: { user: { id: userId } },
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

  async findById(userId: string) {
    const _user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { student: true, teacher: true, admin: true },
    });

    if (!_user) return null;

    const { student, teacher, admin, ...user } = _user;
    return { ...user, roles: _user.roles() };
  }

  findByPhoneNumberForAuth(phoneNumber: string | undefined) {
    if (!phoneNumber) return null;
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.phoneNumber = :phoneNumber', { phoneNumber })
      .getOne();
  }

  findByPhoneNumberForAuthWithRoles(phoneNumber: string) {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.student', 'student')
      .leftJoinAndSelect('user.teacher', 'teacher')
      .leftJoinAndSelect('user.admin', 'admin')
      .where('user.phoneNumber = :phoneNumber', { phoneNumber })
      .getOne();
  }

  findByEmailForAuthWithRoles(email: string) {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.student', 'student')
      .leftJoinAndSelect('user.teacher', 'teacher')
      .leftJoinAndSelect('user.admin', 'admin')
      .where('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .getOne();
  }

  /**
   * Raqam allaqachon talaba sifatida ro'yxatdan o'tganmi.
   *
   * Faqat `student` profili hisobga olinadi: o'qituvchi yoki admin sifatida
   * mavjud foydalanuvchi keyinchalik talaba rolini ham qo'shishi mumkin
   * (`signUp` dagi `addStudentRole` oqimi), shuning uchun ular band deb
   * hisoblanmaydi.
   */
  async hasStudentProfile(phoneNumber: string): Promise<boolean> {
    const count = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.student', 'student')
      .where('user.phoneNumber = :phoneNumber', { phoneNumber })
      .getCount();
    return count > 0;
  }

  async hasStudentProfileByEmail(email: string): Promise<boolean> {
    const count = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.student', 'student')
      .where('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .getCount();
    return count > 0;
  }

  addStudentRole(userId: string, level?: StudentLevel) {
    return this.userRepo.save({ id: userId, student: buildStudent(level) });
  }

  findByPhoneNumber(phoneNumber: string) {
    if (!phoneNumber) {
      return null;
    }

    return this.userRepo.findOne({
      where: {
        phoneNumber,
      },
    });
  }

  findByEmail(email: string) {
    if (!email) {
      return null;
    }

    return this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .getOne();
  }

  findByEmailForAuth(email: string | undefined) {
    if (!email) return null;
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async updateAvatar(userId: string, avatarPath: string) {
    await this.userRepo.update(userId, { avatar: avatarPath });
    return this.findById(userId);
  }

  save(user: Partial<User>) {
    return this.userRepo.save(user);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userRepo.update(userId, { password: passwordHash });
  }

  async setPassword(userId: string, password: string): Promise<void> {
    const exists = await this.userRepo.existsBy({ id: userId });
    if (!exists) throw new NotFoundException('Foydalanuvchi topilmadi');
    await this.updatePassword(userId, await hashPassword(password));
  }
}
