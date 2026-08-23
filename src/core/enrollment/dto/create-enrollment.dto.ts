import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/**
 * Admin talabani kursga qo'lda, to'lovsiz yozadi.
 *
 * `planId` berilsa — kurs, muddat va narx tarifdan olinadi.
 * `courseId` berilsa — `end` sanasi majburiy, chunki muddatni hisoblash uchun tarif yo'q.
 */
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
