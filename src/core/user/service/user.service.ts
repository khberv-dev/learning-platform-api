import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
  ) {}

  async findById(userId: string) {
    const _user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { student: true, teacher: true, admin: true },
    });

    if (!_user) return null;

    const { student, teacher, admin, ...user } = _user;
    return { ...user, roles: _user.roles() };
  }

  findByPhoneNumberForAuth(phoneNumber: string) {
    if (!phoneNumber) return null;
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.phoneNumber = :phoneNumber', { phoneNumber })
      .getOne();
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

  async findStudentMe(userId: string) {
    const student = await this.studentRepo.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
    if (!student) throw new NotFoundException('Talaba topilmadi');
    return student;
  }

  save(user: Partial<User>) {
    return this.userRepo.save(user);
  }
}
