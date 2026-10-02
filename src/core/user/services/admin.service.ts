import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Admin } from '@/core/user/entity/admin.entity';
import { CreateAdminDto } from '@/core/user/dto/create-admin.dto';
import { UpdateAdminDto } from '@/core/user/dto/update-admin.dto';
import { AdminQuery } from '@/core/user/dto/admin-query.dto';
import { paginate, Paginated } from '@/common/dto/pagination-query.dto';
import { hashPassword } from '@/shared/utils/hash.util';

@Injectable()
export class AdminService {
  constructor(@InjectRepository(Admin) private readonly adminRepo: Repository<Admin>) {}

  private async assertEmailFree(email: string, exceptId?: string): Promise<void> {
    const qb = this.adminRepo.createQueryBuilder('admin').where('LOWER(admin.email) = :email', { email });
    if (exceptId) qb.andWhere('admin.id != :exceptId', { exceptId });
    if (await qb.getExists()) throw new BadRequestException('Bu email band');
  }

  async createAdmin(dto: CreateAdminDto): Promise<Admin> {
    await this.assertEmailFree(dto.email);
    const saved = await this.adminRepo.save({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: await hashPassword(dto.password),
      isActive: true,
      isSuperadmin: dto.isSuperadmin ?? false,
    });
    return this.findOneAdmin(saved.id);
  }

  async findAllAdmins(query: AdminQuery): Promise<Paginated<Admin>> {
    const qb = this.adminRepo.createQueryBuilder('admin');

    if (query.isActive !== undefined) qb.andWhere('admin.isActive = :isActive', { isActive: query.isActive });
    if (query.isSuperadmin !== undefined) {
      qb.andWhere('admin.isSuperadmin = :isSuperadmin', { isSuperadmin: query.isSuperadmin });
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('admin.firstName ILIKE :search', { search })
            .orWhere('admin.lastName ILIKE :search', { search })
            .orWhere('admin.email ILIKE :search', { search });
        }),
      );
    }

    const [data, total] = await qb
      .orderBy('admin.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount();
    return paginate(data, total, query);
  }

  async findOneAdmin(id: string): Promise<Admin> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin topilmadi');
    return admin;
  }

  async updateAdmin(actorId: string, id: string, dto: UpdateAdminDto): Promise<Admin> {
    await this.findOneAdmin(id);

    if (actorId === id && (dto.isSuperadmin === false || dto.isActive === false)) {
      throw new BadRequestException("O'zingizni superadminlikdan chiqarib yoki o'chirib bo'lmaydi");
    }
    if (dto.email !== undefined) await this.assertEmailFree(dto.email, id);

    const update: Partial<Admin> = {};
    if (dto.firstName !== undefined) update.firstName = dto.firstName;
    if (dto.lastName !== undefined) update.lastName = dto.lastName;
    if (dto.email !== undefined) update.email = dto.email;
    if (dto.password !== undefined) update.password = await hashPassword(dto.password);
    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (dto.isSuperadmin !== undefined) update.isSuperadmin = dto.isSuperadmin;

    if (Object.keys(update).length > 0) await this.adminRepo.update(id, update);
    return this.findOneAdmin(id);
  }
}
