import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PushAudience } from '@/core/notification/enum/push-audience.enum';

/** Bitta so'rovda yuboriladigan maksimal raqamlar soni. */
export const MAX_PUSH_PHONE_NUMBERS = 500;

export class SendPushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body: string;

  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isPermanent: boolean = false;

  @IsEnum(PushAudience, { message: 'audience `all`, `students`, `teachers` yoki `phones` bo`lishi kerak' })
  audience: PushAudience;

  @ValidateIf((dto: SendPushDto) => dto.audience === PushAudience.PHONES)
  @ArrayNotEmpty({ message: '`phones` uchun kamida bitta telefon raqam kerak' })
  @ArrayMaxSize(MAX_PUSH_PHONE_NUMBERS)
  @Matches(/^998\d{9}$/, { each: true, message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumbers?: string[];
}
