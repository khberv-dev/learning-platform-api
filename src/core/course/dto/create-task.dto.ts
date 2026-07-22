import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class TaskQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[] | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class CreateTaskDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string | null;

  @ApiProperty({ type: [TaskQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskQuestionDto)
  questions: TaskQuestionDto[];

  @ApiPropertyOptional({ description: 'Set to attach plain text content; content type is set to "text" automatically' })
  @IsString()
  @IsOptional()
  file?: string | null;
}
