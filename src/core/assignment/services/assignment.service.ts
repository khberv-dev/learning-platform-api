import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';
import { CreateAssignmentDto } from '@/core/assignment/dto/create-assignment.dto';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { TeacherStatus } from '@/core/user/enum/teacher-status.enum';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
  ) {}

  private effectiveStatus(assignment: Assignment): AssignmentStatus {
    if (assignment.status === AssignmentStatus.ACTIVE && assignment.endDate.getTime() < Date.now()) {
      return AssignmentStatus.EXPIRED;
    }
    return assignment.status;
  }

  private withEffectiveStatus(assignment: Assignment) {
    return { ...assignment, status: this.effectiveStatus(assignment) };
  }

  async createOffer(studentUserId: string, dto: CreateAssignmentDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException("Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak");
    }

    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const teacher = await this.teacherRepo.findOne({ where: { id: dto.teacherId, status: TeacherStatus.ACTIVE } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    return this.assignmentRepo.save({
      student,
      teacher,
      startDate: start,
      endDate: end,
      status: AssignmentStatus.PENDING,
    });
  }

  async findAll(status?: AssignmentStatus) {
    const assignments = await this.assignmentRepo.find({
      where: status ? { status } : {},
      relations: { teacher: { user: true }, student: { user: true } },
      order: { createdAt: 'DESC' },
    });
    return assignments.map((a) => this.withEffectiveStatus(a));
  }

  async findOne(id: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: { teacher: { user: true }, student: { user: true } },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    return this.withEffectiveStatus(assignment);
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

  private async loadTeacherAssignment(teacherUserId: string, assignmentId: string) {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { teacher: true, student: { user: true } },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    if (assignment.teacher.id !== teacher.id) throw new ForbiddenException('Ruxsat berilmagan');

    return assignment;
  }

  async accept(teacherUserId: string, assignmentId: string) {
    const assignment = await this.loadTeacherAssignment(teacherUserId, assignmentId);
    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new BadRequestException('Faqat kutilayotgan topshiriqlarni qabul qilish mumkin');
    }
    assignment.status = AssignmentStatus.ACTIVE;
    const saved = await this.assignmentRepo.save(assignment);
    return this.withEffectiveStatus(saved);
  }

  async reject(teacherUserId: string, assignmentId: string) {
    const assignment = await this.loadTeacherAssignment(teacherUserId, assignmentId);
    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new BadRequestException('Faqat kutilayotgan topshiriqlarni rad etish mumkin');
    }
    assignment.status = AssignmentStatus.REJECTED;
    return this.assignmentRepo.save(assignment);
  }
}
