import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/**
 * Tashqi xizmat yuboradigan yozilish so'rovi. Tarif (plan) so'ralmaydi —
 * uni admin tasdiqlash paytida tanlaydi.
 */
export class CreatePendingEnrollmentDto {
  @ApiProperty({ example: 'u0000000-0000-0000-0000-000000000001', description: 'Foydalanuvchi (user) id' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'c0000000-0000-0000-0000-000000000001' })
  @IsUUID()
  courseId: string;

  @ApiPropertyOptional({ example: '2026-05-18T00:00:00.000Z', description: 'Berilmasa — tasdiqlangan payt' })
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
