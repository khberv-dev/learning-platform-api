import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  async findById(userId: string, excludePassword: boolean = true) {
    const _user = await this.userRepo.findOne({
      where: {
        id: userId,
      },
      relations: {
        student: true,
        teacher: true,
        admin: true,
      },
    });

    if (!_user) {
      return null;
    }

    const { student, teacher, admin, ...user } = _user;

    const { password, ...userData } = user;

    const data = excludePassword ? userData : user;

    return {
      ...data,
      roles: _user.roles(),
    };
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

  save(user: Partial<User>) {
    return this.userRepo.save(user);
  }
}
