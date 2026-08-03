import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '@/core/plan/entity/plan.entity';
import { Course } from '@/core/course/entity/course.entity';
import { CreatePlanDto } from '@/core/plan/dto/create-plan.dto';
import { UpdatePlanDto } from '@/core/plan/dto/update-plan.dto';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
  ) {}

  private async loadCourse(courseId: string): Promise<Course> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    return course;
  }

  async createPlan(courseId: string, dto: CreatePlanDto): Promise<Plan> {
    const course = await this.loadCourse(courseId);
    return this.planRepo.save({ ...dto, course });
  }

  async listPlans(courseId: string): Promise<Plan[]> {
    await this.loadCourse(courseId);
    return this.planRepo.find({
      where: { course: { id: courseId } },
      order: { month: 'ASC', createdAt: 'ASC' },
    });
  }

  async listActivePlans(courseId: string): Promise<Plan[]> {
    await this.loadCourse(courseId);
    return this.planRepo.find({
      where: { course: { id: courseId }, isActive: true },
      order: { month: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOnePlan(courseId: string, planId: string): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { id: planId, course: { id: courseId } } });
    if (!plan) throw new NotFoundException('Tarif topilmadi');
    return plan;
  }

  async updatePlan(courseId: string, planId: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOnePlan(courseId, planId);
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async setActive(courseId: string, planId: string, isActive: boolean): Promise<Plan> {
    const plan = await this.findOnePlan(courseId, planId);
    plan.isActive = isActive;
    return this.planRepo.save(plan);
  }

  async deletePlan(courseId: string, planId: string): Promise<void> {
    const plan = await this.findOnePlan(courseId, planId);
    await this.planRepo.remove(plan);
  }
}
