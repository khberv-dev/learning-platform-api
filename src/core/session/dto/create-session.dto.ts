import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SessionOs } from '@/core/session/enum/session-os.enum';

export class CreateSessionDto {
  @IsEnum(SessionOs)
  os: SessionOs;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  fcmToken: string;
}
