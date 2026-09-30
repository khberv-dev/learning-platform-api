import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Gender } from '@/core/user/enum/gender.enum';

export class CreateAuthorDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @IsOptional()
  description?: string;
}
