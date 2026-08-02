import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaymentStatus } from '@/core/payment/enum/payment-status.enum';

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: [PaymentStatus.PAID, PaymentStatus.CANCELLED], example: PaymentStatus.PAID })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiPropertyOptional({
    example: '2026-05-18T00:00:00.000Z',
    description: "status=paid bo'lganda majburiy — kursga yozilish boshlanish sanasi",
  })
  @IsDateString()
  @IsOptional()
  start?: string;

  @ApiPropertyOptional({
    example: '2026-08-18T00:00:00.000Z',
    description: "status=paid bo'lganda majburiy — kursga yozilish tugash sanasi",
  })
  @IsDateString()
  @IsOptional()
  end?: string;
}
