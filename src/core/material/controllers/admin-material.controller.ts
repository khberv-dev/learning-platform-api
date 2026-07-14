import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { MaterialService } from '@/core/material/services/material.service';
import { CreateMaterialDto } from '@/core/material/dto/create-material.dto';
import { materialStorage, materialFileFilter, toMaterialPath } from '@/core/material/storage/material.storage';
import { MaterialType } from '@/core/material/enum/material-type.enum';

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
@Roles(UserRole.ADMIN)
@Controller('admin/lessons/:lessonId/materials')
export class AdminMaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: materialStorage, fileFilter: materialFileFilter }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'file'],
      properties: {
        name: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ schema: { example: materialExample } })
  createMaterial(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateMaterialDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fayl yuborilmagan');
    const type = file.mimetype === 'application/pdf' ? MaterialType.PDF : MaterialType.IMAGE;
    return this.materialService.createMaterial(lessonId, dto, toMaterialPath(file.filename), type);
  }

  @Get()
  @ApiOkResponse({ schema: { example: [materialExample] } })
  listMaterials(@Param('lessonId') lessonId: string) {
    return this.materialService.listMaterials(lessonId);
  }

  @Delete(':materialId')
  @HttpCode(204)
  @ApiNoContentResponse()
  deleteMaterial(@Param('lessonId') lessonId: string, @Param('materialId') materialId: string) {
    return this.materialService.deleteMaterial(lessonId, materialId);
  }
}
