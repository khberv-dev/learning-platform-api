import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class TaskQuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[] | null;

  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class CreateTaskDto {
  @IsString()
  @IsOptional()
  name?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskQuestionDto)
  @IsOptional()
  questions?: TaskQuestionDto[];

  @IsString()
  @IsOptional()
  file?: string | null;
}
