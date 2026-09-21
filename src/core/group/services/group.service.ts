import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMentor } from '@/core/group/entity/group-mentor.entity';
import { GroupMembership } from '@/core/group/entity/group-membership.entity';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';
import { Student } from '@/core/user/entity/student.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { CreateGroupDto } from '@/core/group/dto/create-group.dto';
import { UpdateGroupDto } from '@/core/group/dto/update-group.dto';
import { GROUP_SORT_COLUMN, GroupQuery } from '@/core/group/dto/group-query.dto';
import { validateGroupScheduleShape } from '@/core/group/utils/group-schedule.util';
import { paginate, Paginated } from '@/common/dto/pagination-query.dto';
import { ChatService } from '@/core/chat/services/chat.service';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMentor) private readonly groupMentorRepo: Repository<GroupMentor>,
    @InjectRepository(GroupMembership) private readonly membershipRepo: Repository<GroupMembership>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Mentor) private readonly mentorRepo: Repository<Mentor>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly chatService: ChatService,
  ) {}

  private assertScheduleShape(schedule?: Record<string, string[]>): void {
    if (!schedule) return;
    const error = validateGroupScheduleShape(schedule);
    if (error) throw new BadRequestException(error);
  }

  private async loadGroup(id: string): Promise<Group> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    return group;
  }

  async createGroup(dto: CreateGroupDto): Promise<Group> {
    this.assertScheduleShape(dto.schedule);
    const group = await this.groupRepo.save({ title: dto.title, schedule: dto.schedule ?? null });
    await this.chatService.createRoomForGroup(group);
    return group;
  }

  async findAllGroups(query: GroupQuery): Promise<Paginated<Group>> {
    const qb = this.groupRepo.createQueryBuilder('group');

    if (query.isActive !== undefined) {
      qb.andWhere('group.isActive = :isActive', { isActive: query.isActive });
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
    const [mentors, students] = await Promise.all([
      this.groupMentorRepo.find({ where: { group: { id } }, relations: { mentor: true } }),
      this.studentRepo.find({ where: { group: { id } } }),
    ]);
    return { ...group, mentors, students };
  }

  async updateGroup(id: string, dto: UpdateGroupDto) {
    await this.loadGroup(id);
    this.assertScheduleShape(dto.schedule);

    const update: Record<string, unknown> = {};
    if (dto.title !== undefined) update.title = dto.title;
    if (dto.schedule !== undefined) update.schedule = dto.schedule;
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
    const students = await this.studentRepo.find({
      where: { id: In(studentIds) },
      relations: { group: true },
    });

    const foundIds = new Set(students.map((s) => s.id));
    const missing = studentIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) throw new NotFoundException(`Talaba(lar) topilmadi: ${missing.join(', ')}`);

    const alreadyGrouped = students.filter((s) => s.group);
    if (alreadyGrouped.length > 0) {
      throw new BadRequestException(
        `Talaba(lar) allaqachon guruhda: ${alreadyGrouped.map((s) => s.id).join(', ')}. Ko'chirish uchun swap ishlatilsin`,
      );
    }

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Student, { id: In(studentIds) }, { group });
      await manager.insert(
        GroupMembership,
        studentIds.map((studentId) => ({ group, student: { id: studentId }, joinedAt: now, leftAt: null })),
      );
    });

    return this.findOneGroup(groupId);
  }

  async removeStudents(groupId: string, studentIds: string[]) {
    await this.loadGroup(groupId);
    const students = await this.studentRepo.find({ where: { id: In(studentIds), group: { id: groupId } } });

    const foundIds = new Set(students.map((s) => s.id));
    const missing = studentIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) throw new BadRequestException(`Talaba(lar) bu guruhda emas: ${missing.join(', ')}`);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Student, { id: In(studentIds) }, { group: null });
      await manager.update(
        GroupMembership,
        { group: { id: groupId }, student: { id: In(studentIds) }, leftAt: IsNull() },
        { leftAt: new Date() },
      );
    });

    return this.findOneGroup(groupId);
  }

  async swapStudent(groupId: string, studentId: string, toGroupId: string) {
    if (groupId === toGroupId) throw new BadRequestException('Talaba allaqachon shu guruhda');

    const [, toGroup, student] = await Promise.all([
      this.loadGroup(groupId),
      this.loadGroup(toGroupId),
      this.studentRepo.findOne({ where: { id: studentId }, relations: { group: true } }),
    ]);
    if (!student) throw new NotFoundException('Talaba topilmadi');
    if (!student.group || student.group.id !== groupId) {
      throw new BadRequestException('Talaba bu guruhda emas');
    }

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Student, studentId, { group: toGroup });
      await manager.update(
        GroupMembership,
        { group: { id: groupId }, student: { id: studentId }, leftAt: IsNull() },
        { leftAt: now },
      );
      await manager.insert(GroupMembership, {
        group: toGroup,
        student: { id: studentId },
        joinedAt: now,
        leftAt: null,
      });
    });

    return this.findOneGroup(toGroupId);
  }

  async assignPrimaryMentor(groupId: string, mentorId: string) {
    await this.loadGroup(groupId);
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    const existingForMentor = await this.groupMentorRepo.findOne({
      where: { group: { id: groupId }, mentor: { id: mentorId } },
    });
    if (existingForMentor?.role === GroupMentorRole.PRIMARY) return this.findOneGroup(groupId);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(GroupMentor, { group: { id: groupId }, role: GroupMentorRole.PRIMARY });
      if (existingForMentor) {
        await manager.update(GroupMentor, existingForMentor.id, { role: GroupMentorRole.PRIMARY });
      } else {
        await manager.insert(GroupMentor, { group: { id: groupId }, mentor, role: GroupMentorRole.PRIMARY });
      }
    });

    return this.findOneGroup(groupId);
  }

  async addSupportMentor(groupId: string, mentorId: string) {
    const group = await this.loadGroup(groupId);
    const mentor = await this.mentorRepo.findOne({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor topilmadi');

    const existing = await this.groupMentorRepo.findOne({
      where: { group: { id: groupId }, mentor: { id: mentorId } },
    });
    if (existing) throw new BadRequestException('Mentor allaqachon guruhda');

    await this.groupMentorRepo.save({ group, mentor, role: GroupMentorRole.SUPPORT });
    return this.findOneGroup(groupId);
  }

  async removeMentor(groupId: string, mentorId: string) {
    await this.loadGroup(groupId);
    const existing = await this.groupMentorRepo.findOne({
      where: { group: { id: groupId }, mentor: { id: mentorId } },
    });
    if (!existing) throw new NotFoundException('Mentor bu guruhda emas');
    await this.groupMentorRepo.remove(existing);
    return this.findOneGroup(groupId);
  }

  async findMyGroup(studentId: string) {
    const student = await this.studentRepo.findOne({ where: { id: studentId }, relations: { group: true } });
    if (!student?.group) return null;
    return this.findOneGroup(student.group.id);
  }

  async findMyGroups(mentorId: string) {
    const rows = await this.groupMentorRepo.find({
      where: { mentor: { id: mentorId } },
      relations: { group: true },
    });
    return Promise.all(rows.map(async (row) => ({ role: row.role, ...(await this.findOneGroup(row.group.id)) })));
  }
}
