import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveLesson } from '@/core/live-lesson/entity/live-lesson.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMentor } from '@/core/group/entity/group-mentor.entity';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';
import { CreateLiveLessonDto } from '@/core/live-lesson/dto/create-live-lesson.dto';
import { UpdateLiveLessonDto } from '@/core/live-lesson/dto/update-live-lesson.dto';
import { Paginated, PaginationQuery, paginate } from '@/common/dto/pagination-query.dto';

@Injectable()
export class LiveLessonService {
  constructor(
    @InjectRepository(LiveLesson) private readonly lessonRepo: Repository<LiveLesson>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMentor) private readonly groupMentorRepo: Repository<GroupMentor>,
  ) {}

  private async assertPrimaryMentor(mentorId: string, groupId: string): Promise<void> {
    const primary = await this.groupMentorRepo.findOne({
      where: { group: { id: groupId }, mentor: { id: mentorId }, role: GroupMentorRole.PRIMARY },
    });
    if (!primary) throw new ForbiddenException('Ruxsat berilmagan');
  }

  private async loadOwned(mentorId: string, lessonId: string) {
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId },
      relations: { mentor: true, group: true },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    if (lesson.mentor.id !== mentorId) throw new ForbiddenException('Ruxsat berilmagan');
    return lesson;
  }

  async create(mentorId: string, dto: CreateLiveLessonDto) {
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak");
    }

    const group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    await this.assertPrimaryMentor(mentor.id, group.id);

    return this.lessonRepo.save({
      mentor,
      group,
      name: dto.name,
      meetLink: dto.meetLink,
      startTime: start,
      endTime: end,
    });
  }

  async findAll(mentorId: string, query: PaginationQuery): Promise<Paginated<LiveLesson>> {
    const [data, total] = await this.lessonRepo.findAndCount({
      where: { mentor: { id: mentorId } },
      relations: { group: true },
      order: { startTime: 'ASC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  findOne(mentorId: string, lessonId: string) {
    return this.loadOwned(mentorId, lessonId);
  }

  async update(mentorId: string, lessonId: string, dto: UpdateLiveLessonDto) {
    const lesson = await this.loadOwned(mentorId, lessonId);

    if (dto.name !== undefined) lesson.name = dto.name;
    if (dto.meetLink !== undefined) lesson.meetLink = dto.meetLink;
    if (dto.startTime !== undefined) lesson.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) lesson.endTime = new Date(dto.endTime);

    if (lesson.endTime.getTime() <= lesson.startTime.getTime()) {
      throw new BadRequestException("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak");
    }

    return this.lessonRepo.save(lesson);
  }

  async remove(mentorId: string, lessonId: string) {
    const lesson = await this.loadOwned(mentorId, lessonId);
    await this.lessonRepo.remove(lesson);
  }

  async findForStudent(studentId: string, query: PaginationQuery): Promise<Paginated<LiveLesson>> {
    const student = await this.studentRepo.findOne({ where: { id: studentId }, relations: { group: true } });
    if (!student?.group) return paginate([], 0, query);

    const [data, total] = await this.lessonRepo.findAndCount({
      where: { group: { id: student.group.id } },
      relations: { group: true, mentor: true },
      order: { startTime: 'ASC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }
}
