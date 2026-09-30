import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AuthorService } from '@/core/author/services/author.service';
import { CreateAuthorDto } from '@/core/author/dto/create-author.dto';
import { UpdateAuthorDto } from '@/core/author/dto/update-author.dto';
import { avatarFileFilter, avatarStorage, toAvatarPath } from '@/core/user/storage/avatar.storage';
import { PaginationQuery } from '@/common/dto/pagination-query.dto';

const avatarUpload = () =>
  UseInterceptors(FileInterceptor('avatar', { storage: avatarStorage, fileFilter: avatarFileFilter }));

@Roles(UserRole.ADMIN)
@Controller('admin/authors')
export class AdminAuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Post()
  @avatarUpload()
  createAuthor(@Body() dto: CreateAuthorDto, @UploadedFile() file?: Express.Multer.File) {
    return this.authorService.createAuthor(dto, file && toAvatarPath(file.filename));
  }

  @Get()
  findAllAuthors(@Query() query: PaginationQuery) {
    return this.authorService.findAllAuthors(query);
  }

  @Get(':id')
  findOneAuthor(@Param('id') id: string) {
    return this.authorService.findOneAuthor(id);
  }

  @Patch(':id')
  @avatarUpload()
  updateAuthor(@Param('id') id: string, @Body() dto: UpdateAuthorDto, @UploadedFile() file?: Express.Multer.File) {
    return this.authorService.updateAuthor(id, dto, file && toAvatarPath(file.filename));
  }

  @Delete(':id')
  @HttpCode(204)
  deleteAuthor(@Param('id') id: string) {
    return this.authorService.deleteAuthor(id);
  }
}
