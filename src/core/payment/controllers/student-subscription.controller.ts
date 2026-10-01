import { Controller, Get, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { SubscriptionService } from '@/core/payment/services/subscription.service';
import { SubscriptionQuery } from '@/core/payment/dto/subscription-query.dto';

@Roles(UserRole.STUDENT)
@Controller('student/subscriptions')
export class StudentSubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  findMySubscriptions(@CurrentUser() user: { id: string }, @Query() query: SubscriptionQuery) {
    return this.subscriptionService.findMySubscriptions(user.id, query);
  }
}
