import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  month: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
