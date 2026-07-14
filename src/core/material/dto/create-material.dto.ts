import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
