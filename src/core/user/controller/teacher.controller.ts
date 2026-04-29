import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorator/roles.decorator';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { TeacherService } from '@/core/user/service/teacher.service';
import { CreateFeedbackDto } from '@/core/user/dto/create-feedback.dto';
import { teacherIntroStorage, introVideoFileFilter, toIntroVideoPath } from '@/core/user/storage/teacher-intro.storage';

@ApiTags('teachers')
@ApiBearerAuth()
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  @Roles(UserRole.STUDENT)
  findActive() {
    return this.teacherService.findActiveTeachers();
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  findOne(@Param('id') id: string) {
    return this.teacherService.findOneActiveTeacher(id);
  }

  @Post(':id/feedbacks')
  @Roles(UserRole.STUDENT)
  addFeedback(@Param('id') id: string, @Body() dto: CreateFeedbackDto, @CurrentUser() user: { id: string }) {
    return this.teacherService.addFeedback(id, user.id, dto);
  }

  @Patch('me')
  @Roles(UserRole.TEACHER)
  @UseInterceptors(FileInterceptor('video', { storage: teacherIntroStorage, fileFilter: introVideoFileFilter }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['video'], properties: { video: { type: 'string', format: 'binary' } } } })
  updateIntroVideo(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { id: string }) {
    return this.teacherService.updateIntroVideo(user.id, toIntroVideoPath(file.filename));
  }
}
