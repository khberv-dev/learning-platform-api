import { PartialType } from '@nestjs/swagger';
import { CreateGroupDto } from '@/core/group/dto/create-group.dto';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}
