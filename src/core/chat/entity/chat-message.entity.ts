import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '@/core/user/entity/user.entity';
import { ChatRoom } from '@/core/chat/entity/chat-room.entity';
import { MessageType } from '@/core/chat/enum/message-type.enum';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChatRoom, (room) => room.messages, { onDelete: 'CASCADE' })
  @JoinColumn()
  chatRoom: ChatRoom;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  sender: User;

  @Column({ type: 'enum', enum: MessageType })
  type: MessageType;

  @Column({ type: 'text', nullable: true })
  text: string;

  @Column({ nullable: true })
  filePath: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  fileMimeType: string;

  @CreateDateColumn()
  createdAt: Date;
}
