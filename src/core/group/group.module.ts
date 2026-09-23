import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from '@/core/group/entity/group.entity';
import { GroupMentor } from '@/core/group/entity/group-mentor.entity';
import { GroupMembership } from '@/core/group/entity/group-membership.entity';
import { Student } from '@/core/user/entity/student.entity';
import { Mentor } from '@/core/user/entity/mentor.entity';
import { GroupService } from '@/core/group/services/group.service';
import { AdminGroupController } from '@/core/group/controllers/admin-group.controller';
import { StudentGroupController } from '@/core/group/controllers/student-group.controller';
import { MentorGroupController } from '@/core/group/controllers/mentor-group.controller';
import { ChatModule } from '@/core/chat/chat.module';
import { NotificationModule } from '@/core/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMentor, GroupMembership, Student, Mentor]),
    ChatModule,
    NotificationModule,
  ],
  controllers: [AdminGroupController, StudentGroupController, MentorGroupController],
  providers: [GroupService],
})
export class GroupModule {}
