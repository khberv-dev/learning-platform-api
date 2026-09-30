import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthorDto } from '@/core/author/dto/create-author.dto';

export class UpdateAuthorDto extends PartialType(CreateAuthorDto) {}
