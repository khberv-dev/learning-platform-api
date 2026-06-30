import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '@/core/user/entity/user.entity';
import { ChatRoom } from '@/core/chat/entity/chat-room.entity';

@Entity('chat_members')
@Unique(['chatRoom', 'user'])
export class ChatMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChatRoom, (room) => room.members, { onDelete: 'CASCADE' })
  @JoinColumn()
  chatRoom: ChatRoom;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  joinedAt: Date;
}
