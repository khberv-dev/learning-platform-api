import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveLessonRecording } from '@/core/live-lesson/entity/live-lesson-recording.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMentor } from '@/core/group/entity/group-mentor.entity';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

@Injectable()
export class LiveLessonRecordingService {
  constructor(
    @InjectRepository(LiveLessonRecording) private readonly recordingRepo: Repository<LiveLessonRecording>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMentor) private readonly groupMentorRepo: Repository<GroupMentor>,
  ) {}

  private async loadStudentGroupId(studentId: string): Promise<string | null> {
    const student = await this.studentRepo.findOne({ where: { id: studentId }, relations: { group: true } });
    return student?.group?.id ?? null;
  }

  async upload(mentorId: string, groupId: string, title: string, videoUrl: string): Promise<LiveLessonRecording> {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    const primary = await this.groupMentorRepo.findOne({
      where: { group: { id: groupId }, mentor: { id: mentor.id }, role: GroupMentorRole.PRIMARY },
    });
    if (!primary) throw new ForbiddenException('Ruxsat berilmagan');

    return this.recordingRepo.save({ title, videoUrl, group });
  }

  async listMyRecordings(studentId: string, query: PaginationQuery): Promise<Paginated<LiveLessonRecording>> {
    const groupId = await this.loadStudentGroupId(studentId);
    if (!groupId) return paginate([], 0, query);

    const [data, total] = await this.recordingRepo.findAndCount({
      where: { group: { id: groupId } },
      relations: { group: true },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async listByGroup(
    studentId: string,
    groupId: string,
    query: PaginationQuery,
  ): Promise<Paginated<LiveLessonRecording>> {
    const studentGroupId = await this.loadStudentGroupId(studentId);
    if (!studentGroupId || studentGroupId !== groupId) throw new ForbiddenException('Ruxsat berilmagan');

    const [data, total] = await this.recordingRepo.findAndCount({
      where: { group: { id: groupId } },
      relations: { group: true },
      order: { createdAt: 'ASC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async findOne(studentId: string, recordingId: string): Promise<LiveLessonRecording> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
      relations: { group: true },
    });
    if (!recording) throw new NotFoundException('Yozuv topilmadi');

    const studentGroupId = await this.loadStudentGroupId(studentId);
    if (!studentGroupId || studentGroupId !== recording.group.id) throw new ForbiddenException('Ruxsat berilmagan');

    return recording;
  }
}
