import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherDto } from '@/core/user/dto/create-teacher.dto';

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {}
