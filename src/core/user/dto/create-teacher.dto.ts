import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber: string;

  @IsString()
  @IsOptional()
  profession: string;

  @IsString()
  @MinLength(6)
  password: string;
}
