import { PartialType } from '@nestjs/mapped-types';
import { TaskQuestionDto } from '@/core/course/dto/create-task.dto';

export class UpdateTaskQuestionDto extends PartialType(TaskQuestionDto) {}
