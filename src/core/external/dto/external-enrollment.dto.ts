import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ExternalEnrollmentDto {
  @ApiProperty({ example: 'f2c8a0e0-1111-2222-3333-444455556666' })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({
    example: 'pl000000-0000-0000-0000-000000000001',
    description: 'Tarif id — kurs va muddat shundan olinadi',
  })
  @IsUUID()
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({
    example: 'c0000000-0000-0000-0000-000000000001',
    description: '`planId` berilmasa majburiy; u holda `end` ham majburiy',
  })
  @IsUUID()
  @IsOptional()
  courseId?: string;

  @ApiProperty({ example: 250000, minimum: 0, description: "To'langan summa" })
  @IsInt()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: '2026-05-18T00:00:00.000Z', description: 'Berilmasa — hozirgi vaqt' })
  @IsDateString()
  @IsOptional()
  start?: string;

  @ApiPropertyOptional({
    example: '2026-08-18T00:00:00.000Z',
    description: "Berilmasa — boshlanishdan tarifdagi oylar soni qo'shiladi",
  })
  @IsDateString()
  @IsOptional()
  end?: string;
}
