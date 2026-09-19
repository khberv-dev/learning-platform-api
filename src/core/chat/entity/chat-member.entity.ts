import { Check, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { ChatRoom } from '@/core/chat/entity/chat-room.entity';

@Entity('chat_members')
@Unique(['chatRoom', 'student'])
@Unique(['chatRoom', 'mentor'])
@Unique(['chatRoom', 'admin'])
@Check(`(("student_id" IS NOT NULL)::int + ("mentor_id" IS NOT NULL)::int + ("admin_id" IS NOT NULL)::int) = 1`)
export class ChatMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChatRoom, (room) => room.members, { onDelete: 'CASCADE' })
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

  @CreateDateColumn()
  joinedAt: Date;
}
