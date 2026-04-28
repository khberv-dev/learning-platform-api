import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/core/user/entity/user.entity';
import { Teacher } from '@/core/user/entity/teacher.entity';
import { TeacherStatusHistory } from '@/core/user/entity/teacher-status-history.entity';
import { Admin } from '@/core/user/entity/admin.entity';
import { UserService } from '@/core/user/service/user.service';
import { TeacherService } from '@/core/user/service/teacher.service';
import { UserController } from '@/core/user/controller/user.controller';
import { AdminTeacherController } from '@/core/user/controller/admin-teacher.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Teacher, TeacherStatusHistory, Admin])],
  controllers: [UserController, AdminTeacherController],
  providers: [UserService, TeacherService],
  exports: [UserService],
})
export class UserModule {}
