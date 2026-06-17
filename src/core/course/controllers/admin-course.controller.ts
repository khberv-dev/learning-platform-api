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
import { CourseService } from '@/core/course/services/course.service';
import { UnitService } from '@/core/course/services/unit.service';
import { LessonService } from '@/core/course/services/lesson.service';
import { TaskService } from '@/core/course/services/task.service';
import { courseImageStorage, imageFileFilter, toImagePath } from '@/core/course/storage/course-image.storage';
import { lessonMediaStorage, toMediaPath, videoFileFilter } from '@/core/course/storage/lesson-media.storage';
import { CreateCourseDto } from '@/core/course/dto/create-course.dto';
import { UpdateCourseDto } from '@/core/course/dto/update-course.dto';
import { CreateUnitDto } from '@/core/course/dto/create-unit.dto';
import { UpdateUnitDto } from '@/core/course/dto/update-unit.dto';
import { CreateLessonDto } from '@/core/course/dto/create-lesson.dto';
import { UpdateLessonDto } from '@/core/course/dto/update-lesson.dto';
import { CreateTaskDto } from '@/core/course/dto/create-task.dto';
import { UpdateTaskDto } from '@/core/course/dto/update-task.dto';

const courseUpload = () =>
  UseInterceptors(FileInterceptor('image', { storage: courseImageStorage, fileFilter: imageFileFilter }));

const courseFormSchema = (required: string[] = ['title']) => ({
  schema: {
    type: 'object',
    required,
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'number' },
      isActive: { type: 'boolean' },
      image: { type: 'string', format: 'binary' },
    },
  },
});

const courseExample = {
  id: 'c0000000-0000-0000-0000-000000000001',
  title: 'English A1',
  description: 'Boshlangich ingliz tili kursi',
  image: '/public/course/eng-a1.png',
  price: 0,
  isActive: true,
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

const courseWithUnitsExample = {
  ...courseExample,
  units: [
    {
      id: 'u0000000-0000-0000-0000-000000000001',
      title: 'Unit 1: Greetings',
      lessons: [],
      lessonsCount: 0,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
    },
  ],
  lessonsCount: 0,
};

const unitExample = {
  id: 'u0000000-0000-0000-0000-000000000001',
  title: 'Unit 1: Greetings',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

const lessonExample = {
  id: 'l0000000-0000-0000-0000-000000000001',
  title: 'Hello!',
  description: 'Saying hello',
  media: '/public/lesson/hello.mp4',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

const taskExample = {
  id: 't0000000-0000-0000-0000-000000000001',
  task: 'Choose the correct greeting.',
  options: ['Hello', 'Goodbye', 'Thank you', 'Sorry'],
  answer: 'Hello',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

@ApiTags('courses')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('courses')
export class AdminCourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly unitService: UnitService,
    private readonly lessonService: LessonService,
    private readonly taskService: TaskService,
  ) {}

  // ── Course ────────────────────────────────────────────────────────────────

  @Post()
  @courseUpload()
  @ApiConsumes('multipart/form-data')
  @ApiBody(courseFormSchema(['title']))
  @ApiCreatedResponse({ schema: { example: courseExample } })
  createCourse(@Body() dto: CreateCourseDto, @UploadedFile() file?: Express.Multer.File) {
    return this.courseService.createCourse(dto, file && toImagePath(file.filename));
  }

  @Get()
  @ApiOkResponse({ schema: { example: [courseWithUnitsExample] } })
  findAllCourses() {
    return this.courseService.findAllCourses();
  }

  @Get(':id')
  @ApiOkResponse({ schema: { example: courseWithUnitsExample } })
  findOneCourse(@Param('id') id: string) {
    return this.courseService.findOneCourse(id);
  }

  @Patch(':id')
  @courseUpload()
  @ApiConsumes('multipart/form-data')
  @ApiBody(courseFormSchema([]))
  @ApiOkResponse({ schema: { example: courseExample } })
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto, @UploadedFile() file?: Express.Multer.File) {
    return this.courseService.updateCourse(id, dto, file && toImagePath(file.filename));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  deleteCourse(@Param('id') id: string) {
    return this.courseService.deleteCourse(id);
  }

  // ── Unit ──────────────────────────────────────────────────────────────────

  @Post(':courseId/units')
  @ApiCreatedResponse({ schema: { example: unitExample } })
  createUnit(@Param('courseId') courseId: string, @Body() dto: CreateUnitDto) {
    return this.unitService.createUnit(courseId, dto);
  }

  @Patch(':courseId/units/:unitId')
  @ApiOkResponse({ schema: { example: unitExample } })
  updateUnit(@Param('courseId') courseId: string, @Param('unitId') unitId: string, @Body() dto: UpdateUnitDto) {
    return this.unitService.updateUnit(courseId, unitId, dto);
  }

  @Delete(':courseId/units/:unitId')
  @HttpCode(204)
  @ApiNoContentResponse()
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
  @ApiCreatedResponse({ schema: { example: lessonExample } })
  createLesson(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Body() dto: CreateLessonDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.lessonService.createLesson(courseId, unitId, dto, file && toMediaPath(file.filename));
  }

  @Patch(':courseId/units/:unitId/lessons/:lessonId')
  @ApiOkResponse({ schema: { example: lessonExample } })
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
  @ApiNoContentResponse()
  deleteLesson(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.lessonService.deleteLesson(courseId, unitId, lessonId);
  }

  // ── Task ──────────────────────────────────────────────────────────────────

  @Post(':courseId/units/:unitId/lessons/:lessonId/tasks')
  @ApiCreatedResponse({ schema: { example: taskExample } })
  createTask(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.taskService.createTask(courseId, unitId, lessonId, dto);
  }

  @Get(':courseId/units/:unitId/lessons/:lessonId/tasks')
  @ApiOkResponse({ schema: { example: [taskExample] } })
  listTasks(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.taskService.listTasks(courseId, unitId, lessonId);
  }

  @Patch(':courseId/units/:unitId/lessons/:lessonId/tasks/:taskId')
  @ApiOkResponse({ schema: { example: taskExample } })
  updateTask(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(courseId, unitId, lessonId, taskId, dto);
  }

  @Delete(':courseId/units/:unitId/lessons/:lessonId/tasks/:taskId')
  @HttpCode(204)
  @ApiNoContentResponse()
  deleteTask(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.deleteTask(courseId, unitId, lessonId, taskId);
  }
}
