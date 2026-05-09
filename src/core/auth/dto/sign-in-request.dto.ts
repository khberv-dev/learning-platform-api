import { IsEmail, IsNotEmpty, IsString, Matches, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInRequest {
  /** @deprecated provide either email or phoneNumber */
  @ApiProperty({ example: 'user@example.com', required: false, deprecated: true })
  @ValidateIf((o: SignInRequest) => !o.phoneNumber)
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email?: string;

  /** @deprecated provide either email or phoneNumber */
  @ApiProperty({ example: '998900012644', required: false, deprecated: true })
  @ValidateIf((o: SignInRequest) => !o.email)
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber?: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
