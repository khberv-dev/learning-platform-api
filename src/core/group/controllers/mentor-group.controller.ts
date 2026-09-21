import { Controller, Get } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { GroupService } from '@/core/group/services/group.service';

@Roles(UserRole.MENTOR)
@Controller('mentor/groups')
export class MentorGroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.groupService.findMyGroups(user.id);
  }
}
