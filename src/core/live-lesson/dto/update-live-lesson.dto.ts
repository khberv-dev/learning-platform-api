import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateLiveLessonDto {
  @ApiPropertyOptional({ example: 'Speaking Practice — Unit 3 (rescheduled)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsUrl()
  @IsOptional()
  meetLink?: string;

  @ApiPropertyOptional({ example: '2026-05-21T15:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-05-21T16:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;
}
