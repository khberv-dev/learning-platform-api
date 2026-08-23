import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonDto } from '@/core/course/dto/create-lesson.dto';

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}
