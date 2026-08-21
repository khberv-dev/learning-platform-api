import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '@/core/session/entity/session.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { User } from '@/core/user/entity/user.entity';
import { EskizService } from '@/core/notification/services/eskiz.service';
import { NotificationService } from '@/core/notification/services/notification.service';
import { FirebaseService } from '@/core/notification/services/firebase.service';
import { PushService } from '@/core/notification/services/push.service';
import { AdminPushController } from '@/core/notification/controllers/admin-push.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Session, Enrollment, User])],
  controllers: [AdminPushController],
  providers: [EskizService, NotificationService, FirebaseService, PushService],
  exports: [NotificationService, PushService],
})
export class NotificationModule {}
