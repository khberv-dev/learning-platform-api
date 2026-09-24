import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '@/core/material/entity/material.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { CreateMaterialDto } from '@/core/material/dto/create-material.dto';
import { MaterialType } from '@/core/material/enum/material-type.enum';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
  ) {}

  private async loadLesson(lessonId: string): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Dars topilmadi');
    return lesson;
  }

  async createMaterial(lessonId: string, dto: CreateMaterialDto, url: string, type: MaterialType): Promise<Material> {
    const lesson = await this.loadLesson(lessonId);
    return this.materialRepo.save({ name: dto.name, url, type, lesson });
  }

  async listAllForLesson(lessonId: string): Promise<Material[]> {
    return this.materialRepo.find({
      where: { lesson: { id: lessonId } },
      order: { createdAt: 'ASC' },
    });
  }

  async listMaterials(lessonId: string, query: PaginationQuery): Promise<Paginated<Material>> {
    await this.loadLesson(lessonId);
    const [data, total] = await this.materialRepo.findAndCount({
      where: { lesson: { id: lessonId } },
      order: { createdAt: 'ASC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async deleteMaterial(lessonId: string, materialId: string): Promise<void> {
    await this.loadLesson(lessonId);
    const material = await this.materialRepo.findOne({ where: { id: materialId, lesson: { id: lessonId } } });
    if (!material) throw new NotFoundException('Material topilmadi');
    await this.materialRepo.remove(material);
  }
}
