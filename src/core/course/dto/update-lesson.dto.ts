import { PartialType } from '@nestjs/swagger';
import { CreateLessonDto } from '@/core/course/dto/create-lesson.dto';

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}
