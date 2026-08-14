import { IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentLevel } from '@/core/user/enum/student-level.enum';

export class SignUpRequest {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: '998900012644' })
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '666666' })
  @IsString()
  @Length(6, 6)
  code: string;

  /** Berilmasa `Student` entitydagi sukut — `A1` qo'llaniladi. */
  @ApiPropertyOptional({ enum: StudentLevel, example: StudentLevel.A1, description: 'Talabaning bilim darajasi' })
  @IsEnum(StudentLevel)
  @IsOptional()
  level?: StudentLevel;
}
