import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMembership } from '@/core/group/entity/group-membership.entity';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';
import { Student } from '@/core/user/entity/student.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Course } from '@/core/course/entity/course.entity';
import { CreateGroupDto } from '@/core/group/dto/create-group.dto';
import { UpdateGroupDto } from '@/core/group/dto/update-group.dto';
import { GROUP_SORT_COLUMN, GroupQuery } from '@/core/group/dto/group-query.dto';
import { validateGroupScheduleShape } from '@/core/group/utils/group-schedule.util';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';
import { ChatService } from '@/core/chat/services/chat.service';
import { PushService } from '@/core/notification/services/push.service';

const GROUP_RELATIONS = { course: true, primaryMentor: true } as const;

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMembership) private readonly membershipRepo: Repository<GroupMembership>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly chatService: ChatService,
    private readonly pushService: PushService,
  ) {}

  private assertScheduleShape(schedule?: Record<string, string[]>): void {
    if (!schedule) return;
    const error = validateGroupScheduleShape(schedule);
    if (error) throw new BadRequestException(error);
  }

  private async loadGroup(id: string): Promise<Group> {
    const group = await this.groupRepo.findOne({ where: { id }, relations: GROUP_RELATIONS });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    return group;
  }

  private async assertNoOtherGroupInCourse(studentIds: string[], group: Group, exceptGroupId?: string): Promise<void> {
    if (!group.course) return;

    const conflicts = await this.membershipRepo.find({
      where: {
        student: { id: In(studentIds) },
        leftAt: IsNull(),
        group: { ...(exceptGroupId && { id: Not(exceptGroupId) }), course: { id: group.course.id } },
      },
      relations: { student: true, group: true },
    });
    if (conflicts.length > 0) {
      throw new BadRequestException(
        `Talaba(lar) bu kursning boshqa guruhida: ${conflicts.map((c) => `${c.student.id} (${c.group.title})`).join(', ')}. Ko'chirish uchun swap ishlatilsin`,
      );
    }
  }

  async createGroup(dto: CreateGroupDto): Promise<Group> {
    this.assertScheduleShape(dto.schedule);
    const course = await this.courseRepo.findOne({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Kurs topilmadi');

    const group = await this.groupRepo.save({ title: dto.title, schedule: dto.schedule ?? null, course });
    await this.chatService.createRoomForGroup(group);
    return this.loadGroup(group.id);
  }

  async findAllGroups(query: GroupQuery): Promise<Paginated<Group>> {
    const qb = this.groupRepo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.course', 'course')
      .leftJoinAndSelect('group.primaryMentor', 'primaryMentor');

    if (query.isActive !== undefined) {
      qb.andWhere('group.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.courseId) {
      qb.andWhere('group.course_id = :courseId', { courseId: query.courseId });
    }
    if (query.search?.trim()) {
      qb.andWhere('group.title ILIKE :search', { search: `%${query.search.trim()}%` });
    }

    const [data, total] = await qb
      .orderBy(GROUP_SORT_COLUMN[query.sortBy], query.sortOrder)
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount();

    return paginate(data, total, query);
  }

  async findOneGroup(id: string) {
    const group = await this.loadGroup(id);
    const memberships = await this.membershipRepo.find({
      where: { group: { id }, leftAt: IsNull() },
      relations: { student: true },
      order: { joinedAt: 'ASC' },
    });
    return { ...group, students: memberships.map((m) => ({ ...m.student, joinedAt: m.joinedAt })) };
  }

  async updateGroup(id: string, dto: UpdateGroupDto) {
    const group = await this.loadGroup(id);
    this.assertScheduleShape(dto.schedule);

    const update: Record<string, unknown> = {};
    if (dto.title !== undefined) update.title = dto.title;
    if (dto.schedule !== undefined) update.schedule = dto.schedule;
    if (dto.courseId !== undefined && dto.courseId !== group.course?.id) {
      const course = await this.courseRepo.findOne({ where: { id: dto.courseId } });
      if (!course) throw new NotFoundException('Kurs topilmadi');

      const members = await this.membershipRepo.find({
        where: { group: { id }, leftAt: IsNull() },
        relations: { student: true },
      });
      if (members.length > 0) {
        await this.assertNoOtherGroupInCourse(
          members.map((m) => m.student.id),
          { ...group, course },
          id,
        );
      }
      update.course = course;
    }
    if (Object.keys(update).length > 0) await this.groupRepo.update(id, update);

    return this.findOneGroup(id);
  }

  async setActive(id: string, isActive: boolean) {
    await this.loadGroup(id);
    await this.groupRepo.update(id, { isActive });
    return this.findOneGroup(id);
  }

  async addStudents(groupId: string, studentIds: string[]) {
    const group = await this.loadGroup(groupId);
    const students = await this.studentRepo.find({ where: { id: In(studentIds) } });

    const foundIds = new Set(students.map((s) => s.id));
    const missing = studentIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) throw new NotFoundException(`Talaba(lar) topilmadi: ${missing.join(', ')}`);

    const alreadyMembers = await this.membershipRepo.find({
      where: { group: { id: groupId }, student: { id: In(studentIds) }, leftAt: IsNull() },
      relations: { student: true },
    });
    if (alreadyMembers.length > 0) {
      throw new BadRequestException(
        `Talaba(lar) allaqachon bu guruhda: ${alreadyMembers.map((m) => m.student.id).join(', ')}`,
      );
    }
    await this.assertNoOtherGroupInCourse(studentIds, group);

    const now = new Date();
    await this.membershipRepo.insert(
      studentIds.map((studentId) => ({ group, student: { id: studentId }, joinedAt: now, leftAt: null })),
    );

    for (const studentId of studentIds) {
      void this.pushService.notifyGroupJoined(studentId, group.title, group.id);
    }

    return this.findOneGroup(groupId);
  }

  async removeStudents(groupId: string, studentIds: string[]) {
    await this.loadGroup(groupId);
    const memberships = await this.membershipRepo.find({
      where: { group: { id: groupId }, student: { id: In(studentIds) }, leftAt: IsNull() },
      relations: { student: true },
    });

    const foundIds = new Set(memberships.map((m) => m.student.id));
    const missing = studentIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) throw new BadRequestException(`Talaba(lar) bu guruhda emas: ${missing.join(', ')}`);

    await this.membershipRepo.update({ id: In(memberships.map((m) => m.id)) }, { leftAt: new Date() });

    return this.findOneGroup(groupId);
  }

  async swapStudent(groupId: string, studentId: string, toGroupId: string) {
    if (groupId === toGroupId) throw new BadRequestException('Talaba allaqachon shu guruhda');

    const [, toGroup, student] = await Promise.all([
      this.loadGroup(groupId),
      this.loadGroup(toGroupId),
      this.studentRepo.findOne({ where: { id: studentId } }),
    ]);
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const membership = await this.membershipRepo.findOne({
      where: { group: { id: groupId }, student: { id: studentId }, leftAt: IsNull() },
    });
    if (!membership) throw new BadRequestException('Talaba bu guruhda emas');

    const alreadyInTarget = await this.membershipRepo.exists({
      where: { group: { id: toGroupId }, student: { id: studentId }, leftAt: IsNull() },
    });
    if (alreadyInTarget) throw new BadRequestException('Talaba allaqachon shu guruhda');
    await this.assertNoOtherGroupInCourse([studentId], toGroup, groupId);

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.update(GroupMembership, membership.id, { leftAt: now });
      await manager.insert(GroupMembership, {
        group: toGroup,
        student: { id: studentId },
        joinedAt: now,
        leftAt: null,
      });
    });

    void this.pushService.notifyGroupJoined(studentId, toGroup.title, toGroup.id);

    return this.findOneGroup(toGroupId);
  }

  async assignPrimaryMentor(groupId: string, mentorId: string) {
    await this.loadGroup(groupId);
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');
    if (mentor.role !== GroupMentorRole.PRIMARY) {
      throw new BadRequestException("Faqat 'primary' turidagi mentor asosiy mentor bo'la oladi");
    }

    await this.groupRepo.update(groupId, { primaryMentor: mentor });
    return this.findOneGroup(groupId);
  }

  async unassignPrimaryMentor(groupId: string) {
    const group = await this.loadGroup(groupId);
    if (!group.primaryMentor) throw new NotFoundException("Guruhda asosiy mentor yo'q");
    await this.groupRepo.update(groupId, { primaryMentor: null });
    return this.findOneGroup(groupId);
  }

  async findStudentGroups(studentId: string, query: PaginationQuery): Promise<Paginated<Group>> {
    const [memberships, total] = await this.membershipRepo.findAndCount({
      where: { student: { id: studentId }, leftAt: IsNull() },
      relations: { group: GROUP_RELATIONS },
      order: { joinedAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(
      memberships.map((m) => m.group),
      total,
      query,
    );
  }

  async findMentorGroups(mentorId: string, query: PaginationQuery): Promise<Paginated<Group>> {
    const [data, total] = await this.groupRepo.findAndCount({
      where: { primaryMentor: { id: mentorId } },
      relations: GROUP_RELATIONS,
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async findOneGroupForMentor(mentorId: string, groupId: string) {
    const group = await this.loadGroup(groupId);
    if (group.primaryMentor?.id !== mentorId) throw new ForbiddenException('Ruxsat berilmagan');
    return this.findOneGroup(groupId);
  }
}
