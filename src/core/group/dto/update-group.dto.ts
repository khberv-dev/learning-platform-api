import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from '@/core/group/dto/create-group.dto';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}
