import { Controller, Get, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { GroupService } from '@/core/group/services/group.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT)
@Controller('student/groups')
export class StudentGroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get('me')
  me(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.groupService.findStudentGroups(user.id, query);
  }
}
