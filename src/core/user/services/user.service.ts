import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Student, buildStudent } from '@/core/user/entity/student.entity';
import { StudentLevel } from '@/core/user/enum/student-level.enum';
import { Repository } from 'typeorm';
import { hashPassword } from '@/shared/utils/hash.util';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

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
