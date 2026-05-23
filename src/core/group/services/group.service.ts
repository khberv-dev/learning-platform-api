import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '@/core/group/entity/group.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { AssignmentStatus } from '@/core/assignment/enum/assignment-status.enum';
import { CreateGroupDto } from '@/core/group/dto/create-group.dto';
import { UpdateGroupDto } from '@/core/group/dto/update-group.dto';
import { Paginated, PaginationQuery, paginate } from '@/common/dto/pagination-query.dto';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
  ) {}

  private async loadTeacher(teacherUserId: string) {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    return teacher;
  }

  private async loadOwnedGroup(teacherUserId: string, groupId: string, withStudents = false) {
    const teacher = await this.loadTeacher(teacherUserId);
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: { teacher: true, ...(withStudents ? { students: { user: true } } : {}) },
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (group.teacher.id !== teacher.id) throw new ForbiddenException('Ruxsat berilmagan');
    return group;
  }

  async create(teacherUserId: string, dto: CreateGroupDto) {
    const teacher = await this.loadTeacher(teacherUserId);
    return this.groupRepo.save({
      teacher,
      name: dto.name,
      description: dto.description,
      isActive: true,
    });
  }

  async findAll(teacherUserId: string, query: PaginationQuery): Promise<Paginated<Group>> {
    const teacher = await this.loadTeacher(teacherUserId);
    const [data, total] = await this.groupRepo.findAndCount({
      where: { teacher: { id: teacher.id } },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  findOne(teacherUserId: string, groupId: string) {
    return this.loadOwnedGroup(teacherUserId, groupId, true);
  }

  async update(teacherUserId: string, groupId: string, dto: UpdateGroupDto) {
    const group = await this.loadOwnedGroup(teacherUserId, groupId);
    if (dto.name !== undefined) group.name = dto.name;
    if (dto.description !== undefined) group.description = dto.description;
    return this.groupRepo.save(group);
  }

  async deactivate(teacherUserId: string, groupId: string) {
    const group = await this.loadOwnedGroup(teacherUserId, groupId);
    if (!group.isActive) throw new BadRequestException('Guruh allaqachon nofaol');
    group.isActive = false;
    return this.groupRepo.save(group);
  }

  async addStudent(teacherUserId: string, groupId: string, studentId: string) {
    const group = await this.loadOwnedGroup(teacherUserId, groupId, true);
    if (!group.isActive) throw new BadRequestException('Nofaol guruhga talaba qoshib bolmaydi');

    const student = await this.studentRepo.findOne({ where: { id: studentId }, relations: { user: true } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const activeAssignment = await this.assignmentRepo.findOne({
      where: {
        teacher: { id: group.teacher.id },
        student: { id: studentId },
        status: AssignmentStatus.ACTIVE,
      },
    });
    if (!activeAssignment || activeAssignment.endDate.getTime() <= Date.now()) {
      throw new ForbiddenException('Bu talaba sizga biriktirilmagan');
    }

    if (group.students.some((s) => s.id === studentId)) {
      throw new BadRequestException('Talaba guruhda mavjud');
    }

    group.students.push(student);
    return this.groupRepo.save(group);
  }

  async removeStudent(teacherUserId: string, groupId: string, studentId: string) {
    const group = await this.loadOwnedGroup(teacherUserId, groupId, true);

    const before = group.students.length;
    group.students = group.students.filter((s) => s.id !== studentId);
    if (group.students.length === before) throw new NotFoundException('Guruhda bunday talaba yoq');

    return this.groupRepo.save(group);
  }
}
