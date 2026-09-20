import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class MentorSignInDto {
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
