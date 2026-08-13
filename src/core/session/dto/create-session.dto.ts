import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SessionOs } from '@/core/session/enum/session-os.enum';

export class CreateSessionDto {
  @ApiProperty({ enum: SessionOs, example: SessionOs.ANDROID })
  @IsEnum(SessionOs)
  os: SessionOs;

  @ApiProperty({ example: 'fH9x_2QwT0aY:APA91bH...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  fcmToken: string;
}
