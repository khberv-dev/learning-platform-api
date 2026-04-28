import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeacherStatus } from '@/core/user/enum/teacher-status.enum';

export class ChangeTeacherStatusDto {
  @ApiProperty({ enum: TeacherStatus })
  @IsEnum(TeacherStatus)
  status: TeacherStatus;
}
