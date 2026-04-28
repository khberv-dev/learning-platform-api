import { PartialType } from '@nestjs/swagger';
import { CreateCourseDto } from '@/core/course/dto/create-course.dto';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
