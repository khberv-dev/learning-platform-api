import { IsDateString, IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateLiveLessonDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  meetLink: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsUUID()
  assignmentId: string;
}
