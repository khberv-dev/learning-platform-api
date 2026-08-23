import { IsEmail, IsNotEmpty, IsString, Matches, ValidateIf } from 'class-validator';

export class SignInRequest {
  /** @deprecated provide either email or phoneNumber */

  @ValidateIf((o: SignInRequest) => !o.phoneNumber)
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email?: string;

  /** @deprecated provide either email or phoneNumber */

  @ValidateIf((o: SignInRequest) => !o.email)
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber?: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
