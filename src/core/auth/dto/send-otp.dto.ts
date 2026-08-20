import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { OtpPurpose } from '@/core/auth/enum/otp-purpose.enum';

export class SendOtpDto {
  @ApiProperty({ example: '998900012644' })
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber: string;

  @ApiPropertyOptional({
    enum: OtpPurpose,
    default: OtpPurpose.REGISTRATION,
    description:
      "Kod nima uchun so'ralmoqda. `registration` (sukut) — raqam band bo'lsa kod yuborilmaydi; " +
      '`recover` — bandlik tekshirilmaydi.',
  })
  @IsEnum(OtpPurpose, { message: "purpose `registration` yoki `recover` bo'lishi kerak" })
  @IsOptional()
  purpose: OtpPurpose = OtpPurpose.REGISTRATION;
}
