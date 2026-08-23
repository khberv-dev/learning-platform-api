import { Controller, Get, Param } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { MaterialService } from '@/core/material/services/material.service';

@Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
@Controller('lessons/:lessonId/materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Get()
  listMaterials(@Param('lessonId') lessonId: string) {
    return this.materialService.listMaterials(lessonId);
  }
}
