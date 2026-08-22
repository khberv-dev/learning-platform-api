import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetUserPasswordDto {
  @ApiProperty({ example: 'newSecret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
