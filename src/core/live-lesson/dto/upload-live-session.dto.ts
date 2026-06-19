import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UploadLiveSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;
}
