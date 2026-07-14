import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from '@/core/material/entity/material.entity';
import { Lesson } from '@/core/course/entity/lesson.entity';
import { MaterialService } from '@/core/material/services/material.service';
import { AdminMaterialController } from '@/core/material/controllers/admin-material.controller';
import { MaterialController } from '@/core/material/controllers/material.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Material, Lesson])],
  controllers: [AdminMaterialController, MaterialController],
  providers: [MaterialService],
})
export class MaterialModule {}
