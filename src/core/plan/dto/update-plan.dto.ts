import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanDto } from '@/core/plan/dto/create-plan.dto';

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
