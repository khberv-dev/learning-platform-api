import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

/**
 * Click `x-www-form-urlencoded` yuboradi, ya'ni barcha qiymatlar matn.
 * `sign_string` xuddi shu xom qiymatlardan hisoblangani uchun ular raqamga
 * o'girilmaydi — aks holda imzo tekshiruvi buziladi.
 */
export const asString = () =>
  Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'number' || typeof value === 'boolean' ? String(value) : value,
  );

export class ClickPrepareDto {
  @ApiProperty({ example: '3086492419' })
  @asString()
  @IsString()
  @IsOptional()
  click_trans_id?: string;

  @ApiProperty({ example: '12345' })
  @asString()
  @IsString()
  @IsOptional()
  service_id?: string;

  @ApiProperty({ example: '1234567' })
  @asString()
  @IsString()
  @IsOptional()
  click_paydoc_id?: string;

  @ApiProperty({ example: 'f2c8a0e0-1111-2222-3333-444455556666', description: 'Foydalanuvchi (user) id' })
  @asString()
  @IsString()
  @IsOptional()
  merchant_trans_id?: string;

  @ApiProperty({ example: '250000.00' })
  @asString()
  @IsString()
  @IsOptional()
  amount?: string;

  @ApiProperty({ example: '0', description: 'Prepare uchun 0' })
  @asString()
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ example: '0' })
  @asString()
  @IsString()
  @IsOptional()
  error?: string;

  @ApiPropertyOptional({ example: '' })
  @asString()
  @IsString()
  @IsOptional()
  error_note?: string;

  @ApiProperty({ example: '2026-08-03 12:00:00' })
  @asString()
  @IsString()
  @IsOptional()
  sign_time?: string;

  @ApiProperty({ example: '5a3f...' })
  @asString()
  @IsString()
  @IsOptional()
  sign_string?: string;
}
