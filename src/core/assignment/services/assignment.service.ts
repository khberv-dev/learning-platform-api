import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';
import { CreateAssignmentDto } from '@/core/assignment/dto/create-assignment.dto';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { TeacherStatus } from '@/core/user/enum/teacher-status.enum';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';
import { ChatService } from '@/core/chat/services/chat.service';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    private readonly chatService: ChatService,
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

  async createOffer(studentUserId: string, dto: CreateAssignmentDto) {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const teacher = await this.teacherRepo.findOne({ where: { id: dto.teacherId, status: TeacherStatus.ACTIVE } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    return this.assignmentRepo.save({
      student,
      teacher,
      startDate: new Date(dto.startDate),
      status: AssignmentStatus.PENDING,
    });
  }

  async findAll(status?: AssignmentStatus) {
    const assignments = await this.assignmentRepo.find({
      where: status ? { status } : {},
      relations: { teacher: { user: true }, student: { user: true } },
      order: { createdAt: 'DESC' },
    });
    return this.attachIsActive(assignments);
  }

  async findOne(id: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: { teacher: { user: true }, student: { user: true } },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    return (await this.attachIsActive([assignment]))[0];
  }

  async findPendingForTeacher(teacherUserId: string) {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    return this.assignmentRepo.find({
      where: { teacher: { id: teacher.id }, status: AssignmentStatus.PENDING },
      relations: { student: { user: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async findAssignmentsForTeacher(teacherUserId: string, query: PaginationQuery): Promise<Paginated<any>> {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    const [assignments, total] = await this.assignmentRepo.findAndCount({
      where: { teacher: { id: teacher.id }, status: Not(AssignmentStatus.PENDING) },
      relations: { student: { user: true } },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    const withIsActive = await this.attachIsActive(assignments);
    return paginate(withIsActive, total, query);
  }

  private async loadTeacherAssignment(teacherUserId: string, assignmentId: string) {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { teacher: true, student: { user: true } },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    if (assignment.teacher.id !== teacher.id) throw new ForbiddenException('Ruxsat berilmagan');

    return { assignment, teacher };
  }

  async accept(teacherUserId: string, assignmentId: string) {
    const { assignment, teacher } = await this.loadTeacherAssignment(teacherUserId, assignmentId);
    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new BadRequestException('Faqat kutilayotgan topshiriqlarni qabul qilish mumkin');
    }
    assignment.status = AssignmentStatus.ACTIVE;
    const saved = await this.assignmentRepo.save(assignment);

    const teacherWithUser = await this.teacherRepo.findOneOrFail({
      where: { id: teacher.id },
      relations: { user: true },
    });
    await this.chatService.createDirectRoom(teacherWithUser.user.id, assignment.student.user.id);

    return (await this.attachIsActive([saved]))[0];
  }

  async reject(teacherUserId: string, assignmentId: string) {
    const { assignment } = await this.loadTeacherAssignment(teacherUserId, assignmentId);
    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new BadRequestException('Faqat kutilayotgan topshiriqlarni rad etish mumkin');
    }
    assignment.status = AssignmentStatus.REJECTED;
    return this.assignmentRepo.save(assignment);
  }
}
