import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from '@/core/course/dto/create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
