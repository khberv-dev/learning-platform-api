import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';
import { CreateAssignmentDto } from '@/core/assignment/dto/create-assignment.dto';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { MentorStatus } from '@/core/user/enum/mentor-status.enum';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';
import { ChatService } from '@/core/chat/services/chat.service';
import { countScheduleSlots, validateScheduleShape } from '@/core/user/dto/set-schedule.dto';
import { PushService } from '@/core/notification/services/push.service';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    private readonly chatService: ChatService,
    private readonly pushService: PushService,
  ) {}

  private async getActiveStudentIds(studentIds: string[]): Promise<Set<string>> {
    if (studentIds.length === 0) return new Set();
    const now = new Date();
    const enrollments = await this.enrollmentRepo.find({
      where: {
        student: { id: In(studentIds) },
        start: LessThanOrEqual(now),
        end: MoreThanOrEqual(now),
      },
      relations: { student: true },
    });
    return new Set(enrollments.map((e) => e.student.id));
  }

  private async attachIsActive<T extends { student: Student; status: AssignmentStatus }>(
    assignments: T[],
  ): Promise<(T & { isActive: boolean })[]> {
    const activeIds = await this.getActiveStudentIds(
      assignments.filter((a) => a.status === AssignmentStatus.ACTIVE).map((a) => a.student.id),
    );
    return assignments.map((a) => ({
      ...a,
      isActive: a.status === AssignmentStatus.ACTIVE && activeIds.has(a.student.id),
    }));
  }

  async createOffer(studentId: string, dto: CreateAssignmentDto) {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const pending = await this.assignmentRepo.findOne({
      where: { student: { id: student.id }, status: AssignmentStatus.PENDING },
    });
    if (pending) throw new BadRequestException('You have a pending request');

    const mentor = await this.mentorRepo.findOne({ where: { id: dto.mentorId, status: MentorStatus.ACTIVE } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    let selectedSchedule: Record<string, string[]> | null = null;
    if (dto.selectedSchedule) {
      const shapeError = validateScheduleShape(dto.selectedSchedule);
      if (shapeError) throw new BadRequestException(shapeError);

      const totalSlots = countScheduleSlots(dto.selectedSchedule);
      if (totalSlots > 3) throw new BadRequestException('Haftada maksimal 3 ta vaqt tanlash mumkin');

      const mentorSchedule = mentor.schedule ?? {};
      for (const [day, slots] of Object.entries(dto.selectedSchedule)) {
        const available = mentorSchedule[day] ?? [];
        for (const slot of slots) {
          if (!available.includes(slot)) {
            throw new BadRequestException(`${day} ${slot} mentorning jadvalida mavjud emas`);
          }
        }
      }
      selectedSchedule = dto.selectedSchedule;
    }

    return this.assignmentRepo.save({
      student,
      mentor,
      startDate: new Date(dto.startDate),
      status: AssignmentStatus.PENDING,
      selectedSchedule,
    });
  }

  async findAll(status?: AssignmentStatus) {
    const assignments = await this.assignmentRepo.find({
      where: status ? { status } : {},
      relations: { mentor: true, student: true },
      order: { createdAt: 'DESC' },
    });
    return this.attachIsActive(assignments);
  }

  async findOne(id: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: { mentor: true, student: true },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    return (await this.attachIsActive([assignment]))[0];
  }

  async findPendingForMentor(mentorId: string) {
    return this.assignmentRepo.find({
      where: { mentor: { id: mentorId }, status: AssignmentStatus.PENDING },
      relations: { student: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAssignmentsForMentor(mentorId: string, query: PaginationQuery): Promise<Paginated<any>> {
    const [assignments, total] = await this.assignmentRepo.findAndCount({
      where: { mentor: { id: mentorId }, status: Not(AssignmentStatus.PENDING) },
      relations: { student: true },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    const withIsActive = await this.attachIsActive(assignments);
    return paginate(withIsActive, total, query);
  }

  private async loadMentorAssignment(mentorId: string, assignmentId: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { mentor: true, student: true },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    if (assignment.mentor.id !== mentorId) throw new ForbiddenException('Ruxsat berilmagan');

    return assignment;
  }

  async accept(mentorId: string, assignmentId: string) {
    const assignment = await this.loadMentorAssignment(mentorId, assignmentId);
    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new BadRequestException('Faqat kutilayotgan topshiriqlarni qabul qilish mumkin');
    }
    assignment.status = AssignmentStatus.ACTIVE;
    const saved = await this.assignmentRepo.save(assignment);

    await this.chatService.createDirectRoom(assignment.student.id, assignment.mentor.id, assignmentId);

    const mentorName = [assignment.mentor.firstName, assignment.mentor.lastName].filter(Boolean).join(' ');
    void this.pushService.notifyMentorAssigned(assignment.student.id, mentorName, assignmentId);

    return (await this.attachIsActive([saved]))[0];
  }

  async reject(mentorId: string, assignmentId: string) {
    const assignment = await this.loadMentorAssignment(mentorId, assignmentId);
    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new BadRequestException('Faqat kutilayotgan topshiriqlarni rad etish mumkin');
    }
    assignment.status = AssignmentStatus.REJECTED;
    return this.assignmentRepo.save(assignment);
  }
}
