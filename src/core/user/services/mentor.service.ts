import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { MentorStatusHistory } from '@/core/user/entity/mentor-status-history.entity';
import { MentorFeedback } from '@/core/user/entity/mentor-feedback.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { Student } from '@/core/user/entity/student.entity';
import { GroupMentor } from '@/core/group/entity/group-mentor.entity';
import { GroupMembership } from '@/core/group/entity/group-membership.entity';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';
import { MentorStatus } from '@/core/user/enum/mentor-status.enum';
import { CreateMentorDto } from '@/core/user/dto/create-mentor.dto';
import { UpdateMentorDto } from '@/core/user/dto/update-mentor.dto';
import { ChangeMentorStatusDto } from '@/core/user/dto/change-mentor-status.dto';
import { CreateFeedbackDto } from '@/core/user/dto/create-feedback.dto';
import { hashPassword } from '@/shared/utils/hash.util';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';
import { MENTOR_SORT_COLUMN, MentorQuery } from '@/core/user/dto/mentor-query.dto';

@Injectable()
export class MentorService {
  constructor(
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(MentorStatusHistory) private readonly statusHistoryRepo: Repository<MentorStatusHistory>,
    @InjectRepository(MentorFeedback) private readonly feedbackRepo: Repository<MentorFeedback>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(GroupMentor) private readonly groupMentorRepo: Repository<GroupMentor>,
    @InjectRepository(GroupMembership) private readonly groupMembershipRepo: Repository<GroupMembership>,
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
      role: dto.role,
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
    if (query.role) {
      qb.andWhere('mentor.role = :role', { role: query.role });
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('mentor.firstName ILIKE :search', { search })
            .orWhere('mentor.lastName ILIKE :search', { search })
            .orWhere('mentor.phoneNumber ILIKE :search', { search });
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
    if (dto.role !== undefined) update.role = dto.role;

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

  async findActiveMentors(query: PaginationQuery) {
    const [mentors, total] = await this.mentorRepo.findAndCount({
      where: { status: MentorStatus.ACTIVE },
      relations: { feedbacks: true },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    const data = mentors.map((m) => this.withSummaryRating(m));
    return paginate(data, total, query);
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

  async updateAvatar(mentorId: string, avatarPath: string) {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');
    return this.mentorRepo.save({ ...mentor, avatar: avatarPath });
  }

  async getSummaryForMentor(mentorId: string) {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const primaryMemberships = await this.groupMentorRepo.find({
      where: { mentor: { id: mentor.id }, role: GroupMentorRole.PRIMARY },
      relations: { group: true },
    });
    const groupIds = primaryMemberships.map((m) => m.group.id);

    const [totalStudents, newStudentsRaw, feedbacks] = await Promise.all([
      groupIds.length > 0 ? this.studentRepo.count({ where: { group: { id: In(groupIds) } } }) : 0,
      groupIds.length > 0
        ? this.groupMembershipRepo
            .createQueryBuilder('gm')
            .select('COUNT(DISTINCT gm.student_id)', 'count')
            .where('gm.group_id IN (:...groupIds)', { groupIds })
            .andWhere('gm.joined_at >= :monthStart', { monthStart })
            .andWhere('gm.joined_at < :monthEnd', { monthEnd })
            .getRawOne<{ count: string }>()
        : Promise.resolve(undefined),
      this.feedbackRepo.find({ where: { mentor: { id: mentor.id } } }),
    ]);

    const averageRating =
      feedbacks.length === 0
        ? 0
        : Math.round((feedbacks.reduce((sum, f) => sum + f.rate, 0) / feedbacks.length) * 10) / 10;

    return {
      totalStudents,
      newStudentsThisMonth: Number(newStudentsRaw?.count ?? 0),
      liveSessionsScheduled: 0,
      averageRating,
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
