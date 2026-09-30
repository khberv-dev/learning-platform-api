import { Controller, Get, Param, Query } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthUser } from '@/common/utils/role-owner.util';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { MaterialService } from '@/core/material/services/material.service';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

@Roles(UserRole.STUDENT, UserRole.MENTOR)
@Controller(['student/lessons/:lessonId/materials', 'mentor/lessons/:lessonId/materials'])
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Get()
  listMaterials(@CurrentUser() user: AuthUser, @Param('lessonId') lessonId: string, @Query() query: PaginationQuery) {
    return this.materialService.listMaterials(lessonId, query, user.role === UserRole.STUDENT ? user.id : undefined);
  }
}
