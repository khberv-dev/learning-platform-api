import { IsInt, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'Juda zoʻr oʻqituvchi, tushuntirishlari aniq' })
  @IsString()
  text: string;

  @ApiProperty({ minimum: 0, maximum: 5, example: 5 })
  @IsInt()
  @Min(0)
  @Max(5)
  rate: number;
}
