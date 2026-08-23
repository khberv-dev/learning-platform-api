import { Controller, Get, Param, Patch, Query } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PushService } from '@/core/notification/services/push.service';

@Roles(UserRole.STUDENT)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly pushService: PushService) {}

  @Get()
  findMine(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.pushService.findUserNotifications(user.id, query);
  }

  @Get('unread')
  findMyUnread(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.pushService.findUnreadUserNotifications(user.id, query);
  }

  @Patch(':id/read')
  markAsRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.pushService.markUserNotificationAsRead(user.id, id);
  }
}
