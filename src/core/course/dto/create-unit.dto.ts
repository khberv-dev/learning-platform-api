import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({ example: 'Unit 1: Greetings' })
  @IsString()
  @IsNotEmpty()
  title: string;
}
