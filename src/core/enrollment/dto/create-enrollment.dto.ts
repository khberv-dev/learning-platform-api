import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  @IsOptional()
  planId?: string;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsDateString()
  @IsOptional()
  start?: string;

  @IsDateString()
  @IsOptional()
  end?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  purchaseAmount?: number;
}
