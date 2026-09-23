import { IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateLiveLessonDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  meetLink: string;

  @IsUUID()
  groupId: string;
}
