import { Module } from '@nestjs/common';
import { EskizService } from '@/core/notification/services/eskiz.service';
import { NotificationService } from '@/core/notification/services/notification.service';

@Module({
  providers: [EskizService, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
