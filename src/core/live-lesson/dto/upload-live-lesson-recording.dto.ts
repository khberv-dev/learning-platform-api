import { IsNotEmpty, IsString } from 'class-validator';

export class UploadLiveLessonRecordingDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}
