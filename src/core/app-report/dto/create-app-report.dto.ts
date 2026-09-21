import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAppReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  device: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  message: string;
}
