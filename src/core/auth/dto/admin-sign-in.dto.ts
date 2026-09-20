import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminSignInDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
