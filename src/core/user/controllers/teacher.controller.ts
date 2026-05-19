import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { TeacherService } from '@/core/user/services/teacher.service';
import { CreateFeedbackDto } from '@/core/user/dto/create-feedback.dto';
import { introVideoFileFilter, teacherIntroStorage, toIntroVideoPath } from '@/core/user/storage/teacher-intro.storage';

const teacherExample = {
  id: 'ab12cd34-5678-90ef-1234-567890abcdef',
  status: 'ACTIVE',
  profession: 'IELTS instructor',
  introVideo: '/public/teacher-intro/intro.mp4',
  user: {
    id: '11111111-2222-3333-4444-555555555555',
    firstName: 'Sevara',
    lastName: 'Karimova',
    avatar: null,
    email: 'sevara@example.com',
    phoneNumber: '998901234567',
    isActive: true,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
  },
  feedbacks: [],
  summaryRating: 4.5,
  createdAt: '2026-01-10T08:00:00.000Z',
  updatedAt: '2026-01-10T08:00:00.000Z',
};

const feedbackExample = {
  id: 'fb000000-0000-0000-0000-000000000001',
  text: 'Juda yaxshi oqituvchi',
  rate: 5,
  createdAt: '2026-05-18T12:00:00.000Z',
  updatedAt: '2026-05-18T12:00:00.000Z',
};

@ApiTags('teachers')
@ApiBearerAuth()
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ schema: { example: [teacherExample] } })
  findActive() {
    return this.teacherService.findActiveTeachers();
  }

  @Get('me/summary')
  @Roles(UserRole.TEACHER)
  @ApiOkResponse({
    schema: {
      example: {
        totalStudents: 124,
        newStudentsThisMonth: 18,
        liveSessionsScheduled: 0,
        averageRating: 4.8,
        pendingApprovals: 3,
      },
    },
  })
  summary(@CurrentUser() user: { id: string }) {
    return this.teacherService.getSummaryForTeacher(user.id);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ schema: { example: teacherExample } })
  findOne(@Param('id') id: string) {
    return this.teacherService.findOneActiveTeacher(id);
  }

  @Post(':id/feedbacks')
  @Roles(UserRole.STUDENT)
  @ApiCreatedResponse({ schema: { example: feedbackExample } })
  addFeedback(@Param('id') id: string, @Body() dto: CreateFeedbackDto, @CurrentUser() user: { id: string }) {
    return this.teacherService.addFeedback(id, user.id, dto);
  }

  @Patch('me')
  @Roles(UserRole.TEACHER)
  @UseInterceptors(FileInterceptor('video', { storage: teacherIntroStorage, fileFilter: introVideoFileFilter }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', required: ['video'], properties: { video: { type: 'string', format: 'binary' } } },
  })
  @ApiOkResponse({ schema: { example: teacherExample } })
  updateIntroVideo(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { id: string }) {
    return this.teacherService.updateIntroVideo(user.id, toIntroVideoPath(file.filename));
  }
}
