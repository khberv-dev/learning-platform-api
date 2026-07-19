import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UploadLiveLessonRecordingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;
}
