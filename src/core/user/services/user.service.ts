import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Repository } from 'typeorm';

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

  addStudentRole(userId: string) {
    return this.userRepo.save({ id: userId, student: new Student() });
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

    return this.userRepo.findOne({
      where: {
        email,
      },
    });
  }

  findByEmailForAuth(email: string | undefined) {
    if (!email) return null;
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async updateAvatar(userId: string, avatarPath: string) {
    await this.userRepo.update(userId, { avatar: avatarPath });
    return this.findById(userId);
  }

  save(user: Partial<User>) {
    return this.userRepo.save(user);
  }
}
