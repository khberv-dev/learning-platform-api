import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { GroupMentorRole } from '@/core/group/enum/group-mentor-role.enum';
import { Gender } from '@/core/user/enum/gender.enum';

export class CreateMentorDto {
  @IsString()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber: string;

  @IsEnum(GroupMentorRole)
  role: GroupMentorRole;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @MinLength(6)
  password: string;
}
