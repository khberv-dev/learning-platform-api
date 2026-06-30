import { CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ChatMember } from '@/core/chat/entity/chat-member.entity';
import { ChatMessage } from '@/core/chat/entity/chat-message.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';

@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Assignment, { onDelete: 'CASCADE', eager: false })
  @JoinColumn()
  assignment: Assignment;

  @OneToMany(() => ChatMember, (member) => member.chatRoom, { cascade: true })
  members: ChatMember[];

  @OneToMany(() => ChatMessage, (message) => message.chatRoom)
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
