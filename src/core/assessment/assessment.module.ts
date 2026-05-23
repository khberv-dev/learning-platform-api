import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '@/core/assessment/entity/conversation.entity';
import { ConversationMessage } from '@/core/assessment/entity/conversation-message.entity';
import { Student } from '@/core/user/entity/student.entity';
import { AssessmentService } from '@/core/assessment/services/assessment.service';
import { GeminiService } from '@/core/assessment/services/gemini.service';
import { AssessmentController } from '@/core/assessment/controllers/assessment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, ConversationMessage, Student])],
  controllers: [AssessmentController],
  providers: [AssessmentService, GeminiService],
})
export class AssessmentModule {}
