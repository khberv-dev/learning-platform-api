import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validateScheduleShape, countScheduleSlots } from '@/core/user/dto/set-schedule.dto';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { TeacherStatusHistory } from '@/core/user/entity/teacher-status-history.entity';
import { TeacherFeedback } from '@/core/user/entity/teacher-feedback.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';
import { TeacherStatus } from '@/core/user/enum/teacher-status.enum';
import { CreateTeacherDto } from '@/core/user/dto/create-teacher.dto';
import { UpdateTeacherDto } from '@/core/user/dto/update-teacher.dto';
import { ChangeTeacherStatusDto } from '@/core/user/dto/change-teacher-status.dto';
import { CreateFeedbackDto } from '@/core/user/dto/create-feedback.dto';
import { UserService } from '@/core/user/services/user.service';
import { hashPassword } from '@/shared/utils/hash.util';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(TeacherStatusHistory) private readonly statusHistoryRepo: Repository<TeacherStatusHistory>,
    @InjectRepository(TeacherFeedback) private readonly feedbackRepo: Repository<TeacherFeedback>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    private readonly userService: UserService,
  ) {}

  async createTeacher(dto: CreateTeacherDto) {
    const existing = await this.userService.findByPhoneNumber(dto.phoneNumber);
    if (existing) throw new BadRequestException('Bu telefon raqam band');

    const passwordHash = await hashPassword(dto.password);
    const teacher = new Teacher();
    teacher.status = TeacherStatus.ACTIVE;
    teacher.profession = dto.profession;

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

  async findAllTeachers(query: PaginationQuery): Promise<Paginated<Teacher>> {
    const [data, total] = await this.teacherRepo.findAndCount({
      relations: { user: true },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
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

    if (dto.profession !== undefined) {
      await this.teacherRepo.update(teacher.id, { profession: dto.profession });
    }

    return this.findOneTeacher(id);
  }

  private withSummaryRating(teacher: Teacher & { feedbacks: TeacherFeedback[] }) {
    const summaryRating =
      teacher.feedbacks.length === 0
        ? 0
        : Math.round((teacher.feedbacks.reduce((sum, f) => sum + f.rate, 0) / teacher.feedbacks.length) * 10) / 10;
    return { ...teacher, summaryRating };
  }

  async findActiveTeachers() {
    const teachers = await this.teacherRepo.find({
      where: { status: TeacherStatus.ACTIVE },
      relations: { user: true, feedbacks: true },
    });
    return teachers.map((t) => this.withSummaryRating(t));
  }

  async findOneActiveTeacher(id: string) {
    const teacher = await this.teacherRepo.findOne({
      where: { id, status: TeacherStatus.ACTIVE },
      relations: { user: true, feedbacks: { student: { user: true } } },
    });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    return this.withSummaryRating(teacher);
  }

  async addFeedback(teacherId: string, studentUserId: string, dto: CreateFeedbackDto) {
    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId, status: TeacherStatus.ACTIVE } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');
    return this.feedbackRepo.save({ teacher, student, ...dto });
  }

  async updateIntroVideo(userId: string, videoPath: string) {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: userId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    return this.teacherRepo.save({ ...teacher, introVideo: videoPath });
  }

  async setSchedule(teacherUserId: string, schedule: Record<string, string[]>) {
    const error = validateScheduleShape(schedule);
    if (error) throw new BadRequestException(error);

    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    await this.teacherRepo.update(teacher.id, { schedule });
    return { schedule };
  }

  async getSchedule(teacherId: string): Promise<Record<string, string[]>> {
    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    return teacher.schedule ?? {};
  }

  async getMySchedule(teacherUserId: string): Promise<Record<string, string[]>> {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    return teacher.schedule ?? {};
  }

  async getSummaryForTeacher(teacherUserId: string) {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [totalRaw, newRaw, pendingApprovals, feedbacks] = await Promise.all([
      this.assignmentRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.student_id)', 'count')
        .where('a.teacher_id = :teacherId', { teacherId: teacher.id })
        .andWhere('a.status = :status', { status: AssignmentStatus.ACTIVE })
        .getRawOne<{ count: string }>(),
      this.assignmentRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.student_id)', 'count')
        .where('a.teacher_id = :teacherId', { teacherId: teacher.id })
        .andWhere('a.created_at >= :monthStart', { monthStart })
        .andWhere('a.created_at < :monthEnd', { monthEnd })
        .getRawOne<{ count: string }>(),
      this.assignmentRepo.count({
        where: { teacher: { id: teacher.id }, status: AssignmentStatus.PENDING },
      }),
      this.feedbackRepo.find({ where: { teacher: { id: teacher.id } } }),
    ]);

    const averageRating =
      feedbacks.length === 0
        ? 0
        : Math.round((feedbacks.reduce((sum, f) => sum + f.rate, 0) / feedbacks.length) * 10) / 10;

    return {
      totalStudents: Number(totalRaw?.count ?? 0),
      newStudentsThisMonth: Number(newRaw?.count ?? 0),
      liveSessionsScheduled: 0,
      averageRating,
      pendingApprovals,
    };
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
