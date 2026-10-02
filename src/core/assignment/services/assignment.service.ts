import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { AssignmentHistory } from '@/core/assignment/entity/assignment-history.entity';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';
import { CreateAssignmentDto } from '@/core/assignment/dto/create-assignment.dto';
import { AssignmentQuery } from '@/core/assignment/dto/assignment-query.dto';
import { validateAssignmentSchedule } from '@/core/assignment/utils/assignment-schedule.util';
import { Subscription } from '@/core/payment/entity/subscription.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { MentorStatus } from '@/core/user/enum/mentor-status.enum';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

const LIST_RELATIONS = { student: true, mentor: true, subscription: { course: true } } as const;
const DETAIL_RELATIONS = { ...LIST_RELATIONS, histories: { mentor: true } } as const;
const HISTORY_ORDER = { histories: { start: 'DESC' } } as const;

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Subscription) private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async requestAssignment(studentId: string, dto: CreateAssignmentDto): Promise<Assignment> {
    const scheduleError = validateAssignmentSchedule(dto.schedule);
    if (scheduleError) throw new BadRequestException(scheduleError);

    const subscription = await this.subscriptionRepo.findOne({
      where: { id: dto.subscriptionId, student: { id: studentId } },
    });
    if (!subscription) throw new NotFoundException('Obuna topilmadi');
    if (!subscription.end || subscription.end <= new Date()) {
      throw new BadRequestException('Obuna muddati tugagan');
    }

    const exists = await this.assignmentRepo.exists({ where: { subscription: { id: subscription.id } } });
    if (exists) throw new BadRequestException("Bu obuna uchun so'rov allaqachon yuborilgan");

    const saved = await this.assignmentRepo.save({
      student: { id: studentId },
      subscription,
      mentor: null,
      status: AssignmentStatus.PENDING,
      start: null,
      schedule: dto.schedule,
    });
    return this.findOneForStudent(studentId, saved.id);
  }

  async findStudentAssignments(studentId: string, query: PaginationQuery): Promise<Paginated<Assignment>> {
    const [data, total] = await this.assignmentRepo.findAndCount({
      where: { student: { id: studentId } },
      relations: LIST_RELATIONS,
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async findOneForStudent(studentId: string, id: string): Promise<Assignment> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id, student: { id: studentId } },
      relations: LIST_RELATIONS,
    });
    if (!assignment) throw new NotFoundException('Biriktirish topilmadi');
    return assignment;
  }

  async findMentorAssignments(mentorId: string, query: PaginationQuery): Promise<Paginated<Assignment>> {
    const [data, total] = await this.assignmentRepo.findAndCount({
      where: { mentor: { id: mentorId } },
      relations: LIST_RELATIONS,
      order: { start: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async findAllAssignments(query: AssignmentQuery): Promise<Paginated<Assignment>> {
    const where: FindOptionsWhere<Assignment> = {};
    if (query.status) where.status = query.status;
    if (query.studentId) where.student = { id: query.studentId };
    if (query.mentorId) where.mentor = { id: query.mentorId };

    const [data, total] = await this.assignmentRepo.findAndCount({
      where,
      relations: LIST_RELATIONS,
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async findOneAssignment(id: string): Promise<Assignment> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: DETAIL_RELATIONS,
      order: HISTORY_ORDER,
    });
    if (!assignment) throw new NotFoundException('Biriktirish topilmadi');
    return assignment;
  }

  async assignMentor(id: string, mentorId: string): Promise<Assignment> {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');
    if (mentor.status !== MentorStatus.WORKING) {
      throw new BadRequestException('Faqat ishlayotgan mentorni biriktirish mumkin');
    }

    await this.dataSource.transaction(async (manager) => {
      const assignment = await manager.getRepository(Assignment).findOne({
        where: { id },
        relations: { mentor: true },
        lock: { mode: 'pessimistic_write', tables: ['assignments'] },
      });
      if (!assignment) throw new NotFoundException('Biriktirish topilmadi');
      if (assignment.mentor?.id === mentor.id) {
        throw new BadRequestException('Mentor allaqachon shu biriktirishga tayinlangan');
      }

      const now = new Date();
      const historyRepo = manager.getRepository(AssignmentHistory);
      await historyRepo.update({ assignment: { id }, end: IsNull() }, { end: now });
      await historyRepo.save({ assignment: { id }, mentor, start: now, end: null });

      await manager.getRepository(Assignment).update(id, {
        mentor,
        status: AssignmentStatus.ACTIVE,
        ...(assignment.start ? {} : { start: now }),
      });
    });

    return this.findOneAssignment(id);
  }
}
