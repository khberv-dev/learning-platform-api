import { IsDateString, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateLiveLessonDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUrl()
  @IsOptional()
  meetLink?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;
}
