import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    description: "Ko'rsatish tartibi. Kichikdan kattaga saralanadi; teng bo'lsa yaratilgan vaqti bo'yicha.",
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  index?: number;
}
