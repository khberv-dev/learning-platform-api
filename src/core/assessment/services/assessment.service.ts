import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { Conversation } from '@/core/assessment/entity/conversation.entity';
import { ConversationMessage } from '@/core/assessment/entity/conversation-message.entity';
import { ConversationRole } from '@/core/assessment/enum/conversation-role.enum';
import { Student } from '@/core/user/entity/student.entity';
import { GeminiService } from '@/core/assessment/services/gemini.service';
import {
  ASSESSMENT_OUTPUT_DEST,
  toInputAudioPath,
  toReplyAudioPath,
} from '@/core/assessment/storage/assessment.storage';
import { Paginated, PaginationQuery, paginate } from '@/common/dto/pagination-query.dto';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(Conversation) private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationMessage) private readonly messageRepo: Repository<ConversationMessage>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    private readonly geminiService: GeminiService,
  ) {}

  private async loadStudent(studentUserId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');
    return student;
  }

  async createConversation(studentUserId: string) {
    const student = await this.loadStudent(studentUserId);
    return this.conversationRepo.save({ student });
  }

  async listConversations(studentUserId: string, query: PaginationQuery): Promise<Paginated<Conversation>> {
    const student = await this.loadStudent(studentUserId);
    const [data, total] = await this.conversationRepo.findAndCount({
      where: { student: { id: student.id } },
      order: { updatedAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async getConversation(studentUserId: string, conversationId: string) {
    const student = await this.loadStudent(studentUserId);
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, student: { id: student.id } },
      relations: { messages: true },
    });
    if (!conversation) throw new NotFoundException('Suhbat topilmadi');
    conversation.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return conversation;
  }

  async sendTurn(studentUserId: string, conversationId: string, file: Express.Multer.File) {
    const conversation = await this.getConversation(studentUserId, conversationId);

    const history = conversation.messages.map((m) => ({
      role: m.role === ConversationRole.ASSISTANT ? ('assistant' as const) : ('user' as const),
      text: m.text,
    }));

    const audio = await fs.readFile(file.path);
    const { transcript, reply } = await this.geminiService.converse(history, audio, file.mimetype);

    const replyWav = await this.geminiService.synthesizeSpeech(reply);
    const replyFilename = `${randomUUID()}.wav`;
    await fs.writeFile(join(ASSESSMENT_OUTPUT_DEST, replyFilename), replyWav);

    const userMessage = await this.messageRepo.save({
      conversation,
      role: ConversationRole.USER,
      text: transcript,
      audioPath: toInputAudioPath(file.filename),
    });
    const assistantMessage = await this.messageRepo.save({
      conversation,
      role: ConversationRole.ASSISTANT,
      text: reply,
      audioPath: toReplyAudioPath(replyFilename),
    });
    await this.conversationRepo.update(conversation.id, { updatedAt: new Date() });

    return { userMessage, assistantMessage };
  }
}
