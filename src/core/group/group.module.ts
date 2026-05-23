import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from '@/core/group/entity/group.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Assignment } from '@/core/assignment/entity/assignment.entity';
import { GroupService } from '@/core/group/services/group.service';
import { GroupController } from '@/core/group/controllers/group.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Teacher, Student, Assignment])],
  controllers: [GroupController],
  providers: [GroupService],
})
export class GroupModule {}
