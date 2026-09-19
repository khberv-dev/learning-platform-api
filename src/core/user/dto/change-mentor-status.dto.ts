import { IsEnum } from 'class-validator';

import { MentorStatus } from '@/core/user/enum/mentor-status.enum';

export class ChangeMentorStatusDto {
  @IsEnum(MentorStatus)
  status: MentorStatus;
}
