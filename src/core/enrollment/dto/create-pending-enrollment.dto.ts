import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/**
 * Tashqi xizmat yuboradigan yozilish so'rovi. Tarif (plan) so'ralmaydi —
 * uni admin tasdiqlash paytida tanlaydi.
 */
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
