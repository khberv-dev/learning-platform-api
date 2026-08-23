import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RecoverPasswordDto {
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
