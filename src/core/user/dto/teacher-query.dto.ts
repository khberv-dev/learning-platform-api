import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { TeacherStatus } from '@/core/user/enum/teacher-status.enum';

/** Saralash faqat shu maydonlar bo'yicha — boshqasi SQL ga tushmaydi. */
export const TEACHER_SORT_FIELDS = ['createdAt', 'updatedAt', 'status', 'profession', 'firstName', 'lastName'] as const;
export type TeacherSortField = (typeof TEACHER_SORT_FIELDS)[number];

/** Saralash maydonining ustun nomiga xaritasi — foydalanuvchi kiritgan matn SQL ga tushmaydi. */
export const TEACHER_SORT_COLUMN: Record<TeacherSortField, string> = {
  createdAt: 'teacher.createdAt',
  updatedAt: 'teacher.updatedAt',
  status: 'teacher.status',
  profession: 'teacher.profession',
  firstName: 'user.firstName',
  lastName: 'user.lastName',
};

export class TeacherQuery extends PaginationQuery {
  @ApiPropertyOptional({
    example: 'Karimova',
    description:
      "Ism, familiya, telefon raqam, email yoki kasb (`profession`) bo'yicha qidiruv " +
      '(katta-kichik harf farqlanmaydi)',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: TeacherStatus })
  @IsEnum(TeacherStatus)
  @IsOptional()
  status?: TeacherStatus;

  @ApiPropertyOptional({ description: 'Foydalanuvchi hisobi faolmi (`user.isActive`)' })
  @Transform(({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: TEACHER_SORT_FIELDS, default: 'createdAt' })
  @IsIn(TEACHER_SORT_FIELDS)
  @IsOptional()
  sortBy: TeacherSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
