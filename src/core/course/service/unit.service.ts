import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from '@/core/course/entity/unit.entity';
import { CourseService } from '@/core/course/service/course.service';
import { CreateUnitDto } from '@/core/course/dto/create-unit.dto';
import { UpdateUnitDto } from '@/core/course/dto/update-unit.dto';

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit) private readonly unitRepo: Repository<Unit>,
    private readonly courseService: CourseService,
  ) {}

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
