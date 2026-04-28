import { PartialType } from '@nestjs/swagger';
import { CreateTeacherDto } from '@/core/user/dto/create-teacher.dto';

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {}
