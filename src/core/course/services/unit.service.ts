import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from '@/core/course/entity/unit.entity';
import { Course } from '@/core/course/entity/course.entity';
import { CourseService, UNIT_ORDER } from '@/core/course/services/course.service';
import { CreateUnitDto } from '@/core/course/dto/create-unit.dto';
import { UpdateUnitDto } from '@/core/course/dto/update-unit.dto';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

export interface StudentUnitListItem {
  id: string;
  title: string;
  lessonsCount: number;
}

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit) private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    private readonly courseService: CourseService,
  ) {}

  async findUnitsForStudent(courseId: string, query: PaginationQuery): Promise<Paginated<StudentUnitListItem>> {
    const course = await this.courseRepo.findOne({ where: { id: courseId, isActive: true } });
    if (!course) throw new NotFoundException('Kurs topilmadi');

    const [units, total] = await this.unitRepo.findAndCount({
      where: { course: { id: courseId } },
      order: UNIT_ORDER,
      skip: query.skip,
      take: query.take,
    });

    const lessonsCountByUnit = await this.courseService.lessonCountsByUnit(units.map((unit) => unit.id));
    const data = units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      lessonsCount: lessonsCountByUnit.get(unit.id) ?? 0,
    }));

    return paginate(data, total, query);
  }

  async createUnit(courseId: string, dto: CreateUnitDto) {
    const course = await this.courseService.findOneCourse(courseId);
    return this.unitRepo.save({ ...dto, course });
  }

  async updateUnit(courseId: string, unitId: string, dto: UpdateUnitDto) {
    const unit = await this.unitRepo.findOne({
      where: { id: unitId, course: { id: courseId } },
    });
    if (!unit) throw new NotFoundException("Bo'lim topilmadi");
    return this.unitRepo.save({ ...unit, ...dto });
  }

  async deleteUnit(courseId: string, unitId: string) {
    const unit = await this.unitRepo.findOne({
      where: { id: unitId, course: { id: courseId } },
    });
    if (!unit) throw new NotFoundException("Bo'lim topilmadi");
    await this.unitRepo.remove(unit);
  }
}
