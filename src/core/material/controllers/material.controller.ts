import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { MaterialService } from '@/core/material/services/material.service';

const materialExample = {
  id: 'm0000000-0000-0000-0000-000000000001',
  name: 'Grammar cheat sheet',
  url: '/public/material/uuid.pdf',
  type: 'pdf',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

@ApiTags('materials')
@ApiBearerAuth()
@Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
@Controller('lessons/:lessonId/materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Get()
  @ApiOkResponse({ schema: { example: [materialExample] } })
  listMaterials(@Param('lessonId') lessonId: string) {
    return this.materialService.listMaterials(lessonId);
  }
}
