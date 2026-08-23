import { IsEnum } from 'class-validator';

import { TeacherStatus } from '@/core/user/enum/teacher-status.enum';

export class ChangeTeacherStatusDto {
  @IsEnum(TeacherStatus)
  status: TeacherStatus;
}
