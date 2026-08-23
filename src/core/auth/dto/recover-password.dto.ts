import { IsEmail, IsNotEmpty, IsString, Length, Matches, ValidateIf } from 'class-validator';

export class RecoverPasswordDto {
  @ValidateIf((dto: RecoverPasswordDto) => !dto.email)
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber?: string;

  @ValidateIf((dto: RecoverPasswordDto) => !dto.phoneNumber)
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email?: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
