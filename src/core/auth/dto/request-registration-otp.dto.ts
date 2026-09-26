import { IsEmail, Matches, ValidateIf } from 'class-validator';

export class RequestRegistrationOtpDto {
  @ValidateIf((dto: RequestRegistrationOtpDto) => !dto.email)
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber?: string;

  @ValidateIf((dto: RequestRegistrationOtpDto) => !dto.phoneNumber)
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email?: string;
}
