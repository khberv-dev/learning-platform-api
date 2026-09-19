import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreatePendingEnrollmentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  courseId: string;

  @IsDateString()
  @IsOptional()
  start?: string;

  @IsDateString()
  @IsOptional()
  end?: string;
}
