import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { TaskFileType } from '@/core/course/enum/task-file-type.enum';

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
  @ApiProperty({ type: [TaskQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskQuestionDto)
  questions: TaskQuestionDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  file?: string | null;

  @ApiPropertyOptional({ enum: TaskFileType })
  @IsEnum(TaskFileType)
  @IsOptional()
  fileType?: TaskFileType | null;
}
