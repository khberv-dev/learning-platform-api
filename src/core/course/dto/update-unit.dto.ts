import { PartialType } from '@nestjs/mapped-types';
import { CreateUnitDto } from '@/core/course/dto/create-unit.dto';

export class UpdateUnitDto extends PartialType(CreateUnitDto) {}
