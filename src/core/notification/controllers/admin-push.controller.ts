import { Body, Controller, Post, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PushService } from '@/core/notification/services/push.service';
import { FirebaseService } from '@/core/notification/services/firebase.service';
import { SendPushDto } from '@/core/notification/dto/send-push.dto';

/** `phones` uchun javob — ommaviy yuborishda `notFound` / `withoutDevice` bo'lmaydi. */
const phonesExample = {
  audience: 'phones',
  devices: 3,
  sent: 3,
  failed: 0,
  removedTokens: 0,
  notFound: ['998900000000'],
  withoutDevice: ['998900012644'],
};

@ApiTags('notifications')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/notifications')
export class AdminPushController {
  constructor(
    private readonly pushService: PushService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Post('push')
  @ApiOperation({
    summary: 'Push xabarnoma yuborish (ommaviy yoki tanlangan raqamlarga)',
    description:
      "`audience`: `all` — barcha qurilmalar, `students` / `teachers` — rol bo'yicha, `phones` — " +
      '`phoneNumbers` dagi raqamlar (bitta yoki bir nechta). ' +
      'Javobda nechta qurilmaga yuborilgani, `phones` uchun esa qaysi raqamlar topilmagani (`notFound`) va ' +
      "qaysilari ilovaga kirmagani (`withoutDevice`) qaytadi. Xabar so'rov ichida yuboriladi.",
  })
  @ApiCreatedResponse({ schema: { example: phonesExample } })
  @ApiServiceUnavailableResponse({
    description: 'GOOGLE_SERVICES_JSON sozlanmagan',
    schema: { example: { message: 'Push xizmati sozlanmagan', statusCode: 503 } },
  })
  async send(@Body() dto: SendPushDto) {
    // Hodisa xabarnomalari jimgina o'tkazib yuboriladi, lekin admin qo'lda
    // yuborganda javob "0 ta yuborildi" bo'lib qolmasligi kerak.
    if (!this.firebaseService.isConfigured()) {
      throw new ServiceUnavailableException('Push xizmati sozlanmagan');
    }

    return this.pushService.sendManual(dto);
  }
}
