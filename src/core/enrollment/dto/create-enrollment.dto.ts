import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  courseId: string;

  @IsUUID()
  planId: string;

  @IsDateString()
  @IsOptional()
  start?: string;
}
