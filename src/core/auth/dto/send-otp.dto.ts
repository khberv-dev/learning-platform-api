import { IsEnum, IsOptional, Matches } from 'class-validator';
import { OtpPurpose } from '@/core/auth/enum/otp-purpose.enum';

export class SendOtpDto {
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber: string;

  @IsEnum(OtpPurpose, { message: "purpose `registration` yoki `recover` bo'lishi kerak" })
  @IsOptional()
  purpose: OtpPurpose = OtpPurpose.REGISTRATION;
}
