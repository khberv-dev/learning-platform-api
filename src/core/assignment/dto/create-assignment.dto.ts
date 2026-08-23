import { IsDateString, IsObject, IsOptional, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  teacherId: string;

  @IsDateString()
  startDate: string;

  @IsObject()
  @IsOptional()
  selectedSchedule?: Record<string, string[]>;
}
