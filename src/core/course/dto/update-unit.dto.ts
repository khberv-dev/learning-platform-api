import { PartialType } from '@nestjs/swagger';
import { CreateUnitDto } from '@/core/course/dto/create-unit.dto';

export class UpdateUnitDto extends PartialType(CreateUnitDto) {}
