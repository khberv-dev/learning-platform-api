import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, default: 0 })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : value))
  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({ required: false, default: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
