import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;
}
