import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Conversation } from '@/core/assessment/entity/conversation.entity';
import { ConversationRole } from '@/core/assessment/enum/conversation-role.enum';

@Entity('conversation_messages')
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ type: 'enum', enum: ConversationRole })
  role: ConversationRole;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'audio_path', nullable: true })
  audioPath: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
