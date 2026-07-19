import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveLessonRecording } from '@/core/live-lesson/entity/live-lesson-recording.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';

@Injectable()
export class LiveLessonRecordingService {
  constructor(
    @InjectRepository(LiveLessonRecording) private readonly recordingRepo: Repository<LiveLessonRecording>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
  ) {}

  async upload(
    teacherUserId: string,
    assignmentId: string,
    title: string,
    videoUrl: string,
  ): Promise<LiveLessonRecording> {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { teacher: true },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    if (assignment.teacher.id !== teacher.id) throw new ForbiddenException('Ruxsat berilmagan');

    return this.recordingRepo.save({ title, videoUrl, assignment });
  }

  async listMyRecordings(studentUserId: string): Promise<LiveLessonRecording[]> {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    return this.recordingRepo.find({
      where: { assignment: { student: { id: student.id } } },
      relations: { assignment: { teacher: { user: true } } },
      order: { createdAt: 'DESC' },
    });
  }

  async listByAssignment(studentUserId: string, assignmentId: string): Promise<LiveLessonRecording[]> {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { student: true },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    if (assignment.student.id !== student.id) throw new ForbiddenException('Ruxsat berilmagan');

    return this.recordingRepo.find({
      where: { assignment: { id: assignmentId } },
      relations: { assignment: { teacher: { user: true } } },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(studentUserId: string, recordingId: string): Promise<LiveLessonRecording> {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
      relations: { assignment: { student: true, teacher: { user: true } } },
    });
    if (!recording) throw new NotFoundException('Yozuv topilmadi');
    if (recording.assignment.student.id !== student.id) throw new ForbiddenException('Ruxsat berilmagan');

    return recording;
  }
}
