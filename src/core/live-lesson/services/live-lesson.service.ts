import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LiveLesson } from '@/core/live-lesson/entity/live-lesson.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMembership } from '@/core/group/entity/group-membership.entity';
import { activeGroupIdsOfStudent, isActiveGroupMember } from '@/core/group/utils/group-membership.util';
import { CreateLiveLessonDto } from '@/core/live-lesson/dto/create-live-lesson.dto';
import { PushService } from '@/core/notification/services/push.service';

@Injectable()
export class LiveLessonService {
  constructor(
    @InjectRepository(LiveLesson) private readonly lessonRepo: Repository<LiveLesson>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMembership) private readonly membershipRepo: Repository<GroupMembership>,
    private readonly pushService: PushService,
  ) {}

  async create(mentorId: string, dto: CreateLiveLessonDto) {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    const group = await this.groupRepo.findOne({ where: { id: dto.groupId }, relations: { primaryMentor: true } });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (group.primaryMentor?.id !== mentor.id) throw new ForbiddenException('Ruxsat berilmagan');

    const lesson = await this.lessonRepo.save({
      mentor,
      group,
      name: dto.name,
      meetLink: dto.meetLink,
    });

    void this.pushService.notifyLiveLessonCreated(group.id, group.title, lesson.name);

    return lesson;
  }

  async findLatestForStudent(studentId: string, groupId?: string): Promise<LiveLesson | null> {
    let groupIds: string[];
    if (groupId) {
      if (!(await isActiveGroupMember(this.membershipRepo, studentId, groupId))) {
        throw new ForbiddenException('Ruxsat berilmagan');
      }
      groupIds = [groupId];
    } else {
      groupIds = await activeGroupIdsOfStudent(this.membershipRepo, studentId);
    }
    if (groupIds.length === 0) return null;

    return this.lessonRepo.findOne({
      where: { group: { id: In(groupIds) } },
      relations: { group: true, mentor: true },
      order: { createdAt: 'DESC' },
    });
  }
}
