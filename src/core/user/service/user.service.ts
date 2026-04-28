import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  async findById(userId: string, excludePassword: boolean = true) {
    const user = await this.userRepo.findOne({
      where: {
        id: userId,
      },
      relations: {
        student: true,
        teacher: true,
        admin: true,
      },
    });

    if (!user) {
      return null;
    }

    const { password, ...userData } = user;

    return excludePassword ? userData : user;
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
