import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveSession } from '@/core/live-lesson/entity/live-session.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';

@Injectable()
export class LiveSessionService {
  constructor(
    @InjectRepository(LiveSession) private readonly sessionRepo: Repository<LiveSession>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
  ) {}

  async upload(teacherUserId: string, assignmentId: string, title: string, videoPath: string): Promise<LiveSession> {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { teacher: true },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    if (assignment.teacher.id !== teacher.id) throw new ForbiddenException('Ruxsat berilmagan');

    return this.sessionRepo.save({ title, videoPath, assignment });
  }

  async listMySessions(studentUserId: string): Promise<LiveSession[]> {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    return this.sessionRepo.find({
      where: { assignment: { student: { id: student.id } } },
      relations: { assignment: { teacher: { user: true } } },
      order: { createdAt: 'DESC' },
    });
  }

  async listByAssignment(studentUserId: string, assignmentId: string): Promise<LiveSession[]> {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { student: true },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    if (assignment.student.id !== student.id) throw new ForbiddenException('Ruxsat berilmagan');

    return this.sessionRepo.find({
      where: { assignment: { id: assignmentId } },
      relations: { assignment: { teacher: { user: true } } },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(studentUserId: string, sessionId: string): Promise<LiveSession> {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: { assignment: { student: true, teacher: { user: true } } },
    });
    if (!session) throw new NotFoundException('Yozuv topilmadi');
    if (session.assignment.student.id !== student.id) throw new ForbiddenException('Ruxsat berilmagan');

    return session;
  }
}
