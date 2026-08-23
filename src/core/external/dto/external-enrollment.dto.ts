import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ExternalEnrollmentDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  @IsOptional()
  planId?: string;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsInt()
  @Min(0)
  amount: number;

  @IsDateString()
  @IsOptional()
  start?: string;

  @IsDateString()
  @IsOptional()
  end?: string;
}
