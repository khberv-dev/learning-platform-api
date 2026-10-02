import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAdminDto } from '@/core/user/dto/create-admin.dto';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
