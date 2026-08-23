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

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { MaterialService } from '@/core/material/services/material.service';
import { CreateMaterialDto } from '@/core/material/dto/create-material.dto';
import {
  materialStorage,
  materialFileFilter,
  materialTypeFor,
  toMaterialPath,
} from '@/core/material/storage/material.storage';

@Roles(UserRole.ADMIN)
@Controller('admin/lessons/:lessonId/materials')
export class AdminMaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: materialStorage, fileFilter: materialFileFilter }))
  createMaterial(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateMaterialDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fayl yuborilmagan');

    // Fayl filtri yaroqsiz turlarni allaqachon rad etadi — bu qo'shimcha himoya.
    const type = materialTypeFor(file);
    if (!type) throw new BadRequestException('Faqat PDF yoki Word (doc, docx) fayllari qabul qilinadi');

    return this.materialService.createMaterial(lessonId, dto, toMaterialPath(file.filename), type);
  }

  @Get()
  listMaterials(@Param('lessonId') lessonId: string) {
    return this.materialService.listMaterials(lessonId);
  }

  @Delete(':materialId')
  @HttpCode(204)
  deleteMaterial(@Param('lessonId') lessonId: string, @Param('materialId') materialId: string) {
    return this.materialService.deleteMaterial(lessonId, materialId);
  }
}
