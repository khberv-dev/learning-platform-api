import { PartialType } from '@nestjs/swagger';
import { TaskQuestionDto } from '@/core/course/dto/create-task.dto';

/**
 * Bitta savolni tahrirlash — berilgan maydonlar almashtiriladi, qolganlari
 * saqlanib qoladi. `options: null` yuborilsa savol ochiq javobli bo'ladi.
 */
export class UpdateTaskQuestionDto extends PartialType(TaskQuestionDto) {}
