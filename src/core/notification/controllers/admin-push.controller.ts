import { Body, Controller, Post, ServiceUnavailableException } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PushService } from '@/core/notification/services/push.service';
import { FirebaseService } from '@/core/notification/services/firebase.service';
import { SendPushDto } from '@/core/notification/dto/send-push.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/notifications')
export class AdminPushController {
  constructor(
    private readonly pushService: PushService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Post('push')
  async send(@Body() dto: SendPushDto) {
    // Hodisa xabarnomalari jimgina o'tkazib yuboriladi, lekin admin qo'lda
    // yuborganda javob "0 ta yuborildi" bo'lib qolmasligi kerak.
    if (!this.firebaseService.isConfigured()) {
      throw new ServiceUnavailableException('Push xizmati sozlanmagan');
    }

    return this.pushService.sendManual(dto);
  }
}
