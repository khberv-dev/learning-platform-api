import { IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

import { StudentLevel } from '@/core/user/enum/student-level.enum';

export class SignUpRequest {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber: string;

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
