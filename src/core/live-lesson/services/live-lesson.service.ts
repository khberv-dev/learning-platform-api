import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveLesson } from '@/core/live-lesson/entity/live-lesson.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { CreateLiveLessonDto } from '@/core/live-lesson/dto/create-live-lesson.dto';
import { UpdateLiveLessonDto } from '@/core/live-lesson/dto/update-live-lesson.dto';
import { Paginated, PaginationQuery, paginate } from '@/common/dto/pagination-query.dto';

@Injectable()
export class LiveLessonService {
  constructor(
    @InjectRepository(LiveLesson) private readonly lessonRepo: Repository<LiveLesson>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
  ) {}

  private async loadTeacher(teacherUserId: string) {
    const teacher = await this.teacherRepo.findOne({ where: { user: { id: teacherUserId } } });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    return teacher;
  }

  private async loadOwned(teacherUserId: string, lessonId: string) {
    const teacher = await this.loadTeacher(teacherUserId);
    const lesson = await this.lessonRepo.findOne({
      where: { id: lessonId },
      relations: { teacher: true, assignment: { student: { user: true }, teacher: { user: true } } },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    if (lesson.teacher.id !== teacher.id) throw new ForbiddenException('Ruxsat berilmagan');
    return lesson;
  }

  async create(teacherUserId: string, dto: CreateLiveLessonDto) {
    const teacher = await this.loadTeacher(teacherUserId);

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak");
    }

    const assignment = await this.assignmentRepo.findOne({
      where: { id: dto.assignmentId },
      relations: { teacher: true },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi');
    if (assignment.teacher.id !== teacher.id) throw new ForbiddenException('Ruxsat berilmagan');

    return this.lessonRepo.save({ teacher, assignment, name: dto.name, meetLink: dto.meetLink, startTime: start, endTime: end });
  }

  async findAll(teacherUserId: string, query: PaginationQuery): Promise<Paginated<LiveLesson>> {
    const teacher = await this.loadTeacher(teacherUserId);
    const [data, total] = await this.lessonRepo.findAndCount({
      where: { teacher: { id: teacher.id } },
      relations: { assignment: { student: { user: true }, teacher: { user: true } } },
      order: { startTime: 'ASC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  findOne(teacherUserId: string, lessonId: string) {
    return this.loadOwned(teacherUserId, lessonId);
  }

  async update(teacherUserId: string, lessonId: string, dto: UpdateLiveLessonDto) {
    const lesson = await this.loadOwned(teacherUserId, lessonId);

    if (dto.name !== undefined) lesson.name = dto.name;
    if (dto.meetLink !== undefined) lesson.meetLink = dto.meetLink;
    if (dto.startTime !== undefined) lesson.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) lesson.endTime = new Date(dto.endTime);

    if (lesson.endTime.getTime() <= lesson.startTime.getTime()) {
      throw new BadRequestException("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak");
    }

    return this.lessonRepo.save(lesson);
  }

  async remove(teacherUserId: string, lessonId: string) {
    const lesson = await this.loadOwned(teacherUserId, lessonId);
    await this.lessonRepo.remove(lesson);
  }
}
