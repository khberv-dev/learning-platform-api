import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateLiveLessonDto {
  @ApiProperty({ example: 'Speaking Practice — Unit 3' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsUrl()
  meetLink: string;

  @ApiProperty({ example: '2026-05-20T15:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-05-20T16:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 'en000000-0000-0000-0000-000000000001' })
  @IsUUID()
  enrollmentId: string;
}
