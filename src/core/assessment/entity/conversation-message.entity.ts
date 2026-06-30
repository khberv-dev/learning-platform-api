import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Conversation } from '@/core/assessment/entity/conversation.entity';
import { ConversationRole } from '@/core/assessment/enum/conversation-role.enum';

@Entity('conversation_messages')
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn()
  conversation: Conversation;

  @Column({ type: 'enum', enum: ConversationRole })
  role: ConversationRole;

  @Column({ type: 'text' })
  text: string;

  @Column({ nullable: true })
  audioPath: string;

  @CreateDateColumn()
  createdAt: Date;
}
