import { IsInt, IsString, Max, Min } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  text: string;

  @IsInt()
  @Min(0)
  @Max(5)
  rate: number;
}
