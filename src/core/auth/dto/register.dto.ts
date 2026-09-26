import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

import { StudentLevel } from '@/core/user/enum/student-level.enum';
import { Gender } from '@/core/user/enum/gender.enum';

export class RegisterDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(StudentLevel)
  @IsOptional()
  level?: StudentLevel;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;
}
