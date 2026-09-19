import { Check, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { ChatRoom } from '@/core/chat/entity/chat-room.entity';
import { MessageType } from '@/core/chat/enum/message-type.enum';

@Entity('chat_messages')
@Check(`(("student_id" IS NOT NULL)::int + ("mentor_id" IS NOT NULL)::int + ("admin_id" IS NOT NULL)::int) = 1`)
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChatRoom, (room) => room.messages, { onDelete: 'CASCADE' })
  @JoinColumn()
  chatRoom: ChatRoom;

  @ManyToOne(() => Student, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  student: Student | null;

  @ManyToOne(() => Mentor, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  mentor: Mentor | null;

  @ManyToOne(() => Admin, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  admin: Admin | null;

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
