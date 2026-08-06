import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/**
 * Admin talabani kursga qo'lda, to'lovsiz yozadi.
 *
 * `planId` berilsa — kurs, muddat va narx tarifdan olinadi.
 * `courseId` berilsa — `end` sanasi majburiy, chunki muddatni hisoblash uchun tarif yo'q.
 */
export class CreateEnrollmentDto {
  @ApiProperty({ example: 'f2c8a0e0-1111-2222-3333-444455556666' })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({
    example: 'pl000000-0000-0000-0000-000000000001',
    description: 'Tarif id — kurs, muddat (month) va narx shundan olinadi',
  })
  @IsUUID()
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({
    example: 'c0000000-0000-0000-0000-000000000001',
    description: 'Tarifsiz yozish uchun kurs id. `planId` berilmasa majburiy',
  })
  @IsUUID()
  @IsOptional()
  courseId?: string;

  @ApiPropertyOptional({ example: '2026-05-18T00:00:00.000Z', description: 'Berilmasa — hozirgi vaqt' })
  @IsDateString()
  @IsOptional()
  start?: string;

  @ApiPropertyOptional({
    example: '2026-08-18T00:00:00.000Z',
    description: "Berilmasa — boshlanishdan tarifdagi oylar soni qo'shiladi. `courseId` bilan majburiy",
  })
  @IsDateString()
  @IsOptional()
  end?: string;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description: "Tarixga yoziladigan summa. Berilmasa — tarif narxi, tarif ham bo'lmasa 0 (bepul)",
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  purchaseAmount?: number;
}
