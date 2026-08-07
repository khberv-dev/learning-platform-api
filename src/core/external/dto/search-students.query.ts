import { ApiProperty } from '@nestjs/swagger';
import { Matches, MinLength } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

export class SearchStudentsQuery extends PaginationQuery {
  @ApiProperty({
    example: '901234',
    description: 'Telefon raqamning bir qismi — kamida 4 ta raqam. Faqat raqamlar qabul qilinadi',
  })
  @Matches(/^\d+$/, { message: "Qidiruv faqat raqamlardan iborat bo'lishi kerak" })
  @MinLength(4, { message: 'Qidiruv uchun kamida 4 ta raqam kerak' })
  phone: string;
}
