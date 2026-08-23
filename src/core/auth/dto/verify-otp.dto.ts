import { IsEmail, IsString, Length, Matches, ValidateIf } from 'class-validator';

export class VerifyOtpDto {
  @ValidateIf((dto: VerifyOtpDto) => !dto.email)
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber?: string;

  @ValidateIf((dto: VerifyOtpDto) => !dto.phoneNumber)
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email?: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
