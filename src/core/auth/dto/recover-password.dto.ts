import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RecoverPasswordDto {
  @ApiProperty({ example: '998900012644' })
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber: string;

  @ApiProperty({ example: '666666' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({ example: 'newSecret123' })
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
