import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

const toBoolean = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

export class AdminQuery extends PaginationQuery {
  @IsString()
  @IsOptional()
  search?: string;

  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  isSuperadmin?: boolean;
}
