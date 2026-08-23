import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from '@/core/course/dto/create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
