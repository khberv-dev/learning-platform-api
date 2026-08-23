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
  @asString()
  @IsString()
  @IsOptional()
  click_trans_id?: string;

  @asString()
  @IsString()
  @IsOptional()
  service_id?: string;

  @asString()
  @IsString()
  @IsOptional()
  click_paydoc_id?: string;

  @asString()
  @IsString()
  @IsOptional()
  merchant_trans_id?: string;

  @asString()
  @IsString()
  @IsOptional()
  amount?: string;

  @asString()
  @IsString()
  @IsOptional()
  action?: string;

  @asString()
  @IsString()
  @IsOptional()
  error?: string;

  @asString()
  @IsString()
  @IsOptional()
  error_note?: string;

  @asString()
  @IsString()
  @IsOptional()
  sign_time?: string;

  @asString()
  @IsString()
  @IsOptional()
  sign_string?: string;
}
