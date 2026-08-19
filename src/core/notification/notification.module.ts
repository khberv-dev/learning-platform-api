import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '@/core/session/entity/session.entity';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EskizService } from '@/core/notification/services/eskiz.service';
import { NotificationService } from '@/core/notification/services/notification.service';
import { FirebaseService } from '@/core/notification/services/firebase.service';
import { PushService } from '@/core/notification/services/push.service';

@Module({
  imports: [TypeOrmModule.forFeature([Session, Enrollment])],
  providers: [EskizService, NotificationService, FirebaseService, PushService],
  exports: [NotificationService, PushService],
})
export class NotificationModule {}
