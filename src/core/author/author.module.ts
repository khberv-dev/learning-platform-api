import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author } from '@/core/author/entity/author.entity';
import { AuthorService } from '@/core/author/services/author.service';
import { AdminAuthorController } from '@/core/author/controllers/admin-author.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Author])],
  controllers: [AdminAuthorController],
  providers: [AuthorService],
})
export class AuthorModule {}
