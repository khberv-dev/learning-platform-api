import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from '@/core/course/dto/create-course.dto';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
