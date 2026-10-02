import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';

@Entity('assignment_history')
export class AssignmentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Assignment, (assignment) => assignment.histories, { onDelete: 'CASCADE' })
  @JoinColumn()
  assignment: Assignment;

  @ManyToOne(() => Mentor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  mentor: Mentor | null;

  @Column({ name: 'start_date', type: 'timestamp' })
  start: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  end: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
