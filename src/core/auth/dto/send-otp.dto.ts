import { IsEmail, IsEnum, IsOptional, Matches, ValidateIf } from 'class-validator';
import { OtpPurpose } from '@/core/auth/enum/otp-purpose.enum';

export class SendOtpDto {
  @ValidateIf((dto: SendOtpDto) => !dto.email)
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber?: string;

  @ValidateIf((dto: SendOtpDto) => !dto.phoneNumber)
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email?: string;

  @IsEnum(OtpPurpose, { message: "purpose `registration` yoki `recover` bo'lishi kerak" })
  @IsOptional()
  purpose: OtpPurpose = OtpPurpose.REGISTRATION;
}
