import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { validateScheduleShape, countScheduleSlots } from '@/core/user/dto/set-schedule.dto';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { MentorStatusHistory } from '@/core/user/entity/mentor-status-history.entity';
import { MentorFeedback } from '@/core/user/entity/mentor-feedback.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';
import { MentorStatus } from '@/core/user/enum/mentor-status.enum';
import { CreateMentorDto } from '@/core/user/dto/create-mentor.dto';
import { UpdateMentorDto } from '@/core/user/dto/update-mentor.dto';
import { ChangeMentorStatusDto } from '@/core/user/dto/change-mentor-status.dto';
import { CreateFeedbackDto } from '@/core/user/dto/create-feedback.dto';
import { hashPassword } from '@/shared/utils/hash.util';
import { paginate, Paginated } from '@/common/dto/pagination-query.dto';
import { MENTOR_SORT_COLUMN, MentorQuery } from '@/core/user/dto/mentor-query.dto';

@Injectable()
export class MentorService {
  constructor(
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(MentorStatusHistory) private readonly statusHistoryRepo: Repository<MentorStatusHistory>,
    @InjectRepository(MentorFeedback) private readonly feedbackRepo: Repository<MentorFeedback>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
  ) {}

  async createMentor(dto: CreateMentorDto) {
    const existing = await this.mentorRepo.existsBy({ phoneNumber: dto.phoneNumber });
    if (existing) throw new BadRequestException('Bu telefon raqam band');

    const passwordHash = await hashPassword(dto.password);

    return this.mentorRepo.save({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      password: passwordHash,
      isActive: true,
      status: MentorStatus.ACTIVE,
      profession: dto.profession,
    });
  }

  async findAllMentors(query: MentorQuery): Promise<Paginated<Mentor>> {
    const qb = this.mentorRepo.createQueryBuilder('mentor');

    if (query.status) {
      qb.andWhere('mentor.status = :status', { status: query.status });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('mentor.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('mentor.firstName ILIKE :search', { search })
            .orWhere('mentor.lastName ILIKE :search', { search })
            .orWhere('mentor.phoneNumber ILIKE :search', { search })
            .orWhere('mentor.profession ILIKE :search', { search });
        }),
      );
    }

    const [data, total] = await qb
      .orderBy(MENTOR_SORT_COLUMN[query.sortBy], query.sortOrder)
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount();

    return paginate(data, total, query);
  }

  async findOneMentor(id: string) {
    const mentor = await this.mentorRepo.findOne({
      where: { id },
      relations: { statusHistories: { changedBy: true } },
    });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');
    return mentor;
  }

  async updateMentor(id: string, dto: UpdateMentorDto) {
    const mentor = await this.findOneMentor(id);

    const update: Record<string, unknown> = {};
    if (dto.firstName !== undefined) update.firstName = dto.firstName;
    if (dto.lastName !== undefined) update.lastName = dto.lastName;
    if (dto.phoneNumber !== undefined) update.phoneNumber = dto.phoneNumber;
    if (dto.password !== undefined) update.password = await hashPassword(dto.password);
    if (dto.profession !== undefined) update.profession = dto.profession;

    if (Object.keys(update).length > 0) {
      await this.mentorRepo.update(mentor.id, update);
    }

    return this.findOneMentor(id);
  }

  private withSummaryRating(mentor: Mentor & { feedbacks: MentorFeedback[] }) {
    const summaryRating =
      mentor.feedbacks.length === 0
        ? 0
        : Math.round((mentor.feedbacks.reduce((sum, f) => sum + f.rate, 0) / mentor.feedbacks.length) * 10) / 10;
    return { ...mentor, summaryRating };
  }

  async findActiveMentors() {
    const mentors = await this.mentorRepo.find({
      where: { status: MentorStatus.ACTIVE },
      relations: { feedbacks: true },
    });
    return mentors.map((m) => this.withSummaryRating(m));
  }

  async findOneActiveMentor(id: string) {
    const mentor = await this.mentorRepo.findOne({
      where: { id, status: MentorStatus.ACTIVE },
      relations: { feedbacks: { student: true } },
    });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');
    return this.withSummaryRating(mentor);
  }

  async addFeedback(mentorId: string, studentId: string, dto: CreateFeedbackDto) {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId, status: MentorStatus.ACTIVE } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');
    return this.feedbackRepo.save({ mentor, student, ...dto });
  }

  async updateIntroVideo(mentorId: string, videoPath: string) {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');
    return this.mentorRepo.save({ ...mentor, introVideo: videoPath });
  }

  async updateIntroVideoById(mentorId: string, videoPath: string) {
    return this.updateIntroVideo(mentorId, videoPath);
  }

  async setSchedule(mentorId: string, schedule: Record<string, string[]>) {
    const error = validateScheduleShape(schedule);
    if (error) throw new BadRequestException(error);

    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    await this.mentorRepo.update(mentor.id, { schedule });
    return { schedule };
  }

  async getSchedule(mentorId: string): Promise<Record<string, string[]>> {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');
    return mentor.schedule ?? {};
  }

  async getMySchedule(mentorId: string): Promise<Record<string, string[]>> {
    return this.getSchedule(mentorId);
  }

  async getSummaryForMentor(mentorId: string) {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [totalRaw, newRaw, pendingApprovals, feedbacks] = await Promise.all([
      this.assignmentRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.student_id)', 'count')
        .where('a.mentor_id = :mentorId', { mentorId: mentor.id })
        .andWhere('a.status = :status', { status: AssignmentStatus.ACTIVE })
        .getRawOne<{ count: string }>(),
      this.assignmentRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.student_id)', 'count')
        .where('a.mentor_id = :mentorId', { mentorId: mentor.id })
        .andWhere('a.created_at >= :monthStart', { monthStart })
        .andWhere('a.created_at < :monthEnd', { monthEnd })
        .getRawOne<{ count: string }>(),
      this.assignmentRepo.count({
        where: { mentor: { id: mentor.id }, status: AssignmentStatus.PENDING },
      }),
      this.feedbackRepo.find({ where: { mentor: { id: mentor.id } } }),
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

  async changeStatus(mentorId: string, dto: ChangeMentorStatusDto, adminId: string) {
    const mentor = await this.findOneMentor(mentorId);

    await this.statusHistoryRepo.save({
      mentor,
      oldStatus: mentor.status,
      newStatus: dto.status,
      changedBy: { id: adminId } as Admin,
    });

    await this.mentorRepo.save({ ...mentor, status: dto.status });
    await this.mentorRepo.update(mentor.id, { isActive: dto.status === MentorStatus.ACTIVE });

    return this.findOneMentor(mentorId);
  }
}
