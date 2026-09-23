import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveLesson } from '@/core/live-lesson/entity/live-lesson.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMentor } from '@/core/group/entity/group-mentor.entity';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';
import { CreateLiveLessonDto } from '@/core/live-lesson/dto/create-live-lesson.dto';
import { PushService } from '@/core/notification/services/push.service';

@Injectable()
export class LiveLessonService {
  constructor(
    @InjectRepository(LiveLesson) private readonly lessonRepo: Repository<LiveLesson>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMentor) private readonly groupMentorRepo: Repository<GroupMentor>,
    private readonly pushService: PushService,
  ) {}

  private async assertPrimaryMentor(mentorId: string, groupId: string): Promise<void> {
    const primary = await this.groupMentorRepo.findOne({
      where: { group: { id: groupId }, mentor: { id: mentorId }, role: GroupMentorRole.PRIMARY },
    });
    if (!primary) throw new ForbiddenException('Ruxsat berilmagan');
  }

  async create(mentorId: string, dto: CreateLiveLessonDto) {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    const group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    await this.assertPrimaryMentor(mentor.id, group.id);

    const lesson = await this.lessonRepo.save({
      mentor,
      group,
      name: dto.name,
      meetLink: dto.meetLink,
    });

    void this.pushService.notifyLiveLessonCreated(group.id, group.title, lesson.name);

    return lesson;
  }

  async findLatestForStudent(studentId: string): Promise<LiveLesson | null> {
    const student = await this.studentRepo.findOne({ where: { id: studentId }, relations: { group: true } });
    if (!student?.group) return null;

    return this.lessonRepo.findOne({
      where: { group: { id: student.group.id } },
      relations: { group: true, mentor: true },
      order: { createdAt: 'DESC' },
    });
  }
}
