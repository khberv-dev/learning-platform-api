import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentTypeDto {
  @ApiProperty({ example: 'Payme' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'https://payme.uz/checkout' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ required: false, default: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
