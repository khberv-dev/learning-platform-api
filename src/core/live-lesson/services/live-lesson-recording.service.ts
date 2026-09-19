import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveLessonRecording } from '@/core/live-lesson/entity/live-lesson-recording.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';

@Injectable()
export class LiveLessonRecordingService {
  constructor(
    @InjectRepository(LiveLessonRecording) private readonly recordingRepo: Repository<LiveLessonRecording>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
  ) {}

  async upload(mentorId: string, assignmentId: string, title: string, videoUrl: string): Promise<LiveLessonRecording> {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { mentor: true },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    if (assignment.mentor.id !== mentor.id) throw new ForbiddenException('Ruxsat berilmagan');

    return this.recordingRepo.save({ title, videoUrl, assignment });
  }

  async listMyRecordings(studentId: string): Promise<LiveLessonRecording[]> {
    return this.recordingRepo.find({
      where: { assignment: { student: { id: studentId } } },
      relations: { assignment: { mentor: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async listByAssignment(studentId: string, assignmentId: string): Promise<LiveLessonRecording[]> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { student: true },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    if (assignment.student.id !== studentId) throw new ForbiddenException('Ruxsat berilmagan');

    return this.recordingRepo.find({
      where: { assignment: { id: assignmentId } },
      relations: { assignment: { mentor: true } },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(studentId: string, recordingId: string): Promise<LiveLessonRecording> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
      relations: { assignment: { student: true, mentor: true } },
    });
    if (!recording) throw new NotFoundException('Yozuv topilmadi');
    if (recording.assignment.student.id !== studentId) throw new ForbiddenException('Ruxsat berilmagan');

    return recording;
  }
}
