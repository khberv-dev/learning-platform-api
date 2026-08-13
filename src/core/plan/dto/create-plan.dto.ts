import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Standart' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 250000, minimum: 0 })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ example: 3, minimum: 1, description: 'Amal qilish muddati (oy)' })
  @IsInt()
  @Min(1)
  month: number;

  @ApiPropertyOptional({ default: false, description: 'Mentor biriktiriladimi' })
  @IsBoolean()
  @IsOptional()
  hasMentor?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: '10305001001000000',
    description: 'Fiskalizatsiya uchun IKPU / MXIK kodi (tasnif.soliq.uz). Berilmasa chek tafsiloti yuborilmaydi',
  })
  @IsString()
  @IsOptional()
  ikpu?: string;

  @ApiPropertyOptional({ example: '1495525', description: 'Qadoq (package) kodi' })
  @IsString()
  @IsOptional()
  packageCode?: string;

  @ApiPropertyOptional({ example: 12, minimum: 0, description: 'QQS stavkasi (%)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  vatPercent?: number;
}
