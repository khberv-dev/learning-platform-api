import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { StudentLevel } from '@/core/user/enum/student-level.enum';

/** Saralash faqat shu maydonlar bo'yicha — boshqasi SQL ga tushmaydi. */
export const STUDENT_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'points',
  'coins',
  'balance',
  'level',
  'firstName',
  'lastName',
] as const;
export type StudentSortField = (typeof STUDENT_SORT_FIELDS)[number];

/** Saralash maydonining ustun nomiga xaritasi — foydalanuvchi kiritgan matn SQL ga tushmaydi. */
export const STUDENT_SORT_COLUMN: Record<StudentSortField, string> = {
  createdAt: 'student.createdAt',
  updatedAt: 'student.updatedAt',
  points: 'student.points',
  coins: 'student.coins',
  balance: 'student.balance',
  level: 'student.level',
  firstName: 'user.firstName',
  lastName: 'user.lastName',
};

export class StudentQuery extends PaginationQuery {
  @ApiPropertyOptional({
    example: 'Sevara',
    description: "Ism, familiya, telefon raqam yoki email bo'yicha qidiruv (katta-kichik harf farqlanmaydi)",
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: StudentLevel })
  @IsEnum(StudentLevel)
  @IsOptional()
  level?: StudentLevel;

  @ApiPropertyOptional({ description: 'Foydalanuvchi hisobi faolmi (`user.isActive`)' })
  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Kamida bitta muddati tugamagan faol kursi bormi' })
  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  hasCourse?: boolean;

  @ApiPropertyOptional({ enum: STUDENT_SORT_FIELDS, default: 'createdAt' })
  @IsIn(STUDENT_SORT_FIELDS)
  @IsOptional()
  sortBy: StudentSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
