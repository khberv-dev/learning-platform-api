import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  courseId: string;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;

  @IsNumber()
  @Min(0)
  purchaseAmount: number;
}
