import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';

import { StudentLevel } from '@/core/user/enum/student-level.enum';

export class SignUpRequest {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ValidateIf((dto: SignUpRequest) => !dto.email)
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber?: string;

  @ValidateIf((dto: SignUpRequest) => !dto.phoneNumber)
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @Length(6, 6)
  code: string;

  /** Berilmasa `Student` entitydagi sukut — `A1` qo'llaniladi. */

  @IsEnum(StudentLevel)
  @IsOptional()
  level?: StudentLevel;
}
