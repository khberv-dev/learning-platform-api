import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PushService } from '@/core/notification/services/push.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly pushService: PushService) {}

  @Get()
  @ApiOperation({ summary: "Talabaning doimiy xabarnomalari ro'yxati" })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 'n0000000-0000-0000-0000-000000000001',
            title: 'Kursga yozildingiz',
            body: '«English A1» kursiga muvaffaqiyatli yozildingiz. Darslarni boshlashingiz mumkin.',
            data: { event: 'course_enrolled', courseId: 'c0000000-0000-0000-0000-000000000001' },
            createdAt: '2026-08-22T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  findMine(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.pushService.findUserNotifications(user.id, query);
  }
}
