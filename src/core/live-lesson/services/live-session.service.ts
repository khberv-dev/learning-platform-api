import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveSession } from '@/core/live-lesson/entity/live-session.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';

@Injectable()
export class LiveSessionService {
  constructor(
    @InjectRepository(LiveSession) private readonly sessionRepo: Repository<LiveSession>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
  ) {}

  async upload(teacherUserId: string, enrollmentId: string, title: string, videoPath: string): Promise<LiveSession> {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Yozilish topilmadi');

    return this.sessionRepo.save({ title, videoPath, teacher, enrollment });
  }

  async listByEnrollment(studentUserId: string, enrollmentId: string): Promise<LiveSession[]> {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId },
      relations: { student: true },
    });
    if (!enrollment) throw new NotFoundException('Yozilish topilmadi');
    if (enrollment.student.id !== student.id) throw new ForbiddenException('Ruxsat berilmagan');

    return this.sessionRepo.find({
      where: { enrollment: { id: enrollmentId } },
      order: { createdAt: 'ASC' },
    });
  }

  async listMySessions(studentUserId: string): Promise<LiveSession[]> {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    return this.sessionRepo.find({
      where: { enrollment: { student: { id: student.id } } },
      relations: { enrollment: { course: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(studentUserId: string, sessionId: string): Promise<LiveSession> {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: { enrollment: { student: true } },
    });
    if (!session) throw new NotFoundException('Yozuv topilmadi');
    if (session.enrollment.student.id !== student.id) throw new ForbiddenException('Ruxsat berilmagan');

    return session;
  }
}
