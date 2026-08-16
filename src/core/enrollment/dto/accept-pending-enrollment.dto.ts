import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/** Admin so'rovni tasdiqlaydi va tarifni tanlaydi — narx va muddat shundan olinadi. */
export class AcceptPendingEnrollmentDto {
  @ApiProperty({
    example: 'pl000000-0000-0000-0000-000000000001',
    description: "Tarif id — so'rovdagi kursga tegishli bo'lishi shart",
  })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({
    example: 250000,
    minimum: 0,
    description: "To'langan summa. Berilmasa — tarif narxi",
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  amount?: number;
}
