import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  index?: number;
}
