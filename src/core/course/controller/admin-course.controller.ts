import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorator/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { CourseService } from '@/core/course/service/course.service';
import { UnitService } from '@/core/course/service/unit.service';
import { LessonService } from '@/core/course/service/lesson.service';
import { courseImageStorage, imageFileFilter, toImagePath } from '@/core/course/storage/course-image.storage';
import { lessonMediaStorage, toMediaPath, videoFileFilter } from '@/core/course/storage/lesson-media.storage';
import { CreateCourseDto } from '@/core/course/dto/create-course.dto';
import { UpdateCourseDto } from '@/core/course/dto/update-course.dto';
import { CreateUnitDto } from '@/core/course/dto/create-unit.dto';
import { UpdateUnitDto } from '@/core/course/dto/update-unit.dto';
import { CreateLessonDto } from '@/core/course/dto/create-lesson.dto';
import { UpdateLessonDto } from '@/core/course/dto/update-lesson.dto';

const courseUpload = () =>
  UseInterceptors(FileInterceptor('image', { storage: courseImageStorage, fileFilter: imageFileFilter }));

const courseFormSchema = (required: string[] = ['title']) => ({
  schema: {
    type: 'object',
    required,
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      isActive: { type: 'boolean' },
      image: { type: 'string', format: 'binary' },
    },
  },
});

@ApiTags('admin / courses')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('courses')
export class AdminCourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly unitService: UnitService,
    private readonly lessonService: LessonService,
  ) {}

  // ── Course ────────────────────────────────────────────────────────────────

  @Post()
  @courseUpload()
  @ApiConsumes('multipart/form-data')
  @ApiBody(courseFormSchema(['title']))
  createCourse(@Body() dto: CreateCourseDto, @UploadedFile() file?: Express.Multer.File) {
    return this.courseService.createCourse(dto, file && toImagePath(file.filename));
  }

  @Get()
  findAllCourses() {
    return this.courseService.findAllCourses();
  }

  @Get(':id')
  findOneCourse(@Param('id') id: string) {
    return this.courseService.findOneCourse(id);
  }

  @Patch(':id')
  @courseUpload()
  @ApiConsumes('multipart/form-data')
  @ApiBody(courseFormSchema([]))
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto, @UploadedFile() file?: Express.Multer.File) {
    return this.courseService.updateCourse(id, dto, file && toImagePath(file.filename));
  }

  @Delete(':id')
  @HttpCode(204)
  deleteCourse(@Param('id') id: string) {
    return this.courseService.deleteCourse(id);
  }

  // ── Unit ──────────────────────────────────────────────────────────────────

  @Post(':courseId/units')
  createUnit(@Param('courseId') courseId: string, @Body() dto: CreateUnitDto) {
    return this.unitService.createUnit(courseId, dto);
  }

  @Patch(':courseId/units/:unitId')
  updateUnit(@Param('courseId') courseId: string, @Param('unitId') unitId: string, @Body() dto: UpdateUnitDto) {
    return this.unitService.updateUnit(courseId, unitId, dto);
  }

  @Delete(':courseId/units/:unitId')
  @HttpCode(204)
  deleteUnit(@Param('courseId') courseId: string, @Param('unitId') unitId: string) {
    return this.unitService.deleteUnit(courseId, unitId);
  }

  // ── Lesson ────────────────────────────────────────────────────────────────

  @Post(':courseId/units/:unitId/lessons')
  @UseInterceptors(FileInterceptor('media', { storage: lessonMediaStorage, fileFilter: videoFileFilter }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        media: { type: 'string', format: 'binary' },
      },
    },
  })
  createLesson(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Body() dto: CreateLessonDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.lessonService.createLesson(courseId, unitId, dto, file && toMediaPath(file.filename));
  }

  @Patch(':courseId/units/:unitId/lessons/:lessonId')
  updateLesson(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonService.updateLesson(courseId, unitId, lessonId, dto);
  }

  @Delete(':courseId/units/:unitId/lessons/:lessonId')
  @HttpCode(204)
  deleteLesson(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.lessonService.deleteLesson(courseId, unitId, lessonId);
  }
}
