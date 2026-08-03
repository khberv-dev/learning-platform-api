import { PartialType } from '@nestjs/swagger';
import { CreatePlanDto } from '@/core/plan/dto/create-plan.dto';

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
