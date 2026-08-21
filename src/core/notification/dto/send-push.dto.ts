import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PushAudience } from '@/core/notification/enum/push-audience.enum';

/** Bitta so'rovda yuboriladigan maksimal raqamlar soni. */
export const MAX_PUSH_PHONE_NUMBERS = 500;

export class SendPushDto {
  @ApiProperty({ example: 'Dars jadvali yangilandi', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Ertangi darslar bir soatga suriltirildi.', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body: string;

  @ApiProperty({
    enum: PushAudience,
    example: PushAudience.PHONES,
    description:
      "`all` — barcha qurilmalar, `students` / `teachers` — rol bo'yicha, " +
      '`phones` — `phoneNumbers` dagi raqamlar. Majburiy: tasodifan hammaga yuborilib ketmasin.',
  })
  @IsEnum(PushAudience, { message: 'audience `all`, `students`, `teachers` yoki `phones` bo`lishi kerak' })
  audience: PushAudience;

  @ApiPropertyOptional({
    type: [String],
    example: ['998900012644'],
    description: '`audience: phones` bo`lganda majburiy',
  })
  @ValidateIf((dto: SendPushDto) => dto.audience === PushAudience.PHONES)
  @ArrayNotEmpty({ message: '`phones` uchun kamida bitta telefon raqam kerak' })
  @ArrayMaxSize(MAX_PUSH_PHONE_NUMBERS)
  @Matches(/^998\d{9}$/, { each: true, message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumbers?: string[];
}
