import { IsArray, IsUUID } from 'class-validator';
import type { AssignmentSchedule } from '@/core/assignment/utils/assignment-schedule.util';

export class CreateAssignmentDto {
  @IsUUID()
  subscriptionId: string;

  @IsArray()
  schedule: AssignmentSchedule;
}
