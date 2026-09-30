import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LiveLessonRecording } from '@/core/live-lesson/entity/live-lesson-recording.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMembership } from '@/core/group/entity/group-membership.entity';
import { activeGroupIdsOfStudent, isActiveGroupMember } from '@/core/group/utils/group-membership.util';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

@Injectable()
export class LiveLessonRecordingService {
  constructor(
    @InjectRepository(LiveLessonRecording) private readonly recordingRepo: Repository<LiveLessonRecording>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMembership) private readonly membershipRepo: Repository<GroupMembership>,
  ) {}

  async upload(mentorId: string, groupId: string, title: string, videoUrl: string): Promise<LiveLessonRecording> {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: { primaryMentor: true } });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (group.primaryMentor?.id !== mentor.id) throw new ForbiddenException('Ruxsat berilmagan');

    return this.recordingRepo.save({ title, videoUrl, group });
  }

  async listMyRecordings(studentId: string, query: PaginationQuery): Promise<Paginated<LiveLessonRecording>> {
    const groupIds = await activeGroupIdsOfStudent(this.membershipRepo, studentId);
    if (groupIds.length === 0) return paginate([], 0, query);

    const [data, total] = await this.recordingRepo.findAndCount({
      where: { group: { id: In(groupIds) } },
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
    if (!(await isActiveGroupMember(this.membershipRepo, studentId, groupId))) {
      throw new ForbiddenException('Ruxsat berilmagan');
    }

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

    if (!(await isActiveGroupMember(this.membershipRepo, studentId, recording.group.id))) {
      throw new ForbiddenException('Ruxsat berilmagan');
    }

    return recording;
  }
}
