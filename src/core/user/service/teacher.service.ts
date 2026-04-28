import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { TeacherStatusHistory } from '@/core/user/entity/teacher-status-history.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { TeacherStatus } from '@/core/user/enum/teacher-status.enum';
import { CreateTeacherDto } from '@/core/user/dto/create-teacher.dto';
import { UpdateTeacherDto } from '@/core/user/dto/update-teacher.dto';
import { ChangeTeacherStatusDto } from '@/core/user/dto/change-teacher-status.dto';
import { UserService } from '@/core/user/service/user.service';
import { hashPassword } from '@/shared/util/hash.util';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(TeacherStatusHistory) private readonly statusHistoryRepo: Repository<TeacherStatusHistory>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
    private readonly userService: UserService,
  ) {}

  async createTeacher(dto: CreateTeacherDto) {
    const existing = await this.userService.findByPhoneNumber(dto.phoneNumber);
    if (existing) throw new BadRequestException('Bu telefon raqam band');

    const passwordHash = await hashPassword(dto.password);
    const teacher = new Teacher();
    teacher.status = TeacherStatus.ACTIVE;

    const user = await this.userService.save({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      password: passwordHash,
      isActive: true,
      teacher,
    });

    return this.teacherRepo.findOne({ where: { user: { id: user.id } }, relations: { user: true } });
  }

  findAllTeachers() {
    return this.teacherRepo.find({ relations: { user: true } });
  }

  async findOneTeacher(id: string) {
    const teacher = await this.teacherRepo.findOne({
      where: { id },
      relations: { user: true, statusHistories: { changedBy: true } },
    });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    return teacher;
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto) {
    const teacher = await this.findOneTeacher(id);

    const update: Record<string, unknown> = {};
    if (dto.firstName !== undefined) update.firstName = dto.firstName;
    if (dto.lastName !== undefined) update.lastName = dto.lastName;
    if (dto.email !== undefined) update.email = dto.email;
    if (dto.phoneNumber !== undefined) update.phoneNumber = dto.phoneNumber;
    if (dto.password !== undefined) update.password = await hashPassword(dto.password);

    if (Object.keys(update).length > 0) {
      await this.userService.save({ id: teacher.user.id, ...update });
    }

    return this.findOneTeacher(id);
  }

  async changeStatus(teacherId: string, dto: ChangeTeacherStatusDto, adminUserId: string) {
    const teacher = await this.findOneTeacher(teacherId);
    const admin = await this.adminRepo.findOne({ where: { user: { id: adminUserId } } });

    await this.statusHistoryRepo.save({
      teacher,
      oldStatus: teacher.status,
      newStatus: dto.status,
      changedBy: admin,
    });

    await this.teacherRepo.save({ ...teacher, status: dto.status });
    await this.userService.save({ id: teacher.user.id, isActive: dto.status === TeacherStatus.ACTIVE });

    return this.findOneTeacher(teacherId);
  }
}
