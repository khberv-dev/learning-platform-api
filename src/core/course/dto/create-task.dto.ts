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

  /**
   * Berilmasa — bo'sh ro'yxat. Topshiriq avval yaratilib, savollar keyin
   * bittalab qo'shilishi mumkin (`POST .../tasks/:taskId/questions`), shuning
   * uchun yaratishda savol majburiy emas.
   */
  @ApiPropertyOptional({ type: [TaskQuestionDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskQuestionDto)
  @IsOptional()
  questions?: TaskQuestionDto[];

  @ApiPropertyOptional({ description: 'Set to attach plain text content; content type is set to "text" automatically' })
  @IsString()
  @IsOptional()
  file?: string | null;
}
