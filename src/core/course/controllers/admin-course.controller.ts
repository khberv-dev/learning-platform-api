import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { CourseService } from '@/core/course/services/course.service';
import { UnitService } from '@/core/course/services/unit.service';
import { LessonService } from '@/core/course/services/lesson.service';
import { TaskService } from '@/core/course/services/task.service';
import { courseImageStorage, imageFileFilter, toImagePath } from '@/core/course/storage/course-image.storage';
import { lessonMediaStorage, toMediaPath, videoFileFilter } from '@/core/course/storage/lesson-media.storage';
import {
  taskContentFileFilter,
  taskContentStorage,
  taskContentTypeOf,
  toTaskContentPath,
} from '@/core/course/storage/task-content.storage';
import { CreateCourseDto } from '@/core/course/dto/create-course.dto';
import { UpdateCourseDto } from '@/core/course/dto/update-course.dto';
import { CreateUnitDto } from '@/core/course/dto/create-unit.dto';
import { UpdateUnitDto } from '@/core/course/dto/update-unit.dto';
import { CreateLessonDto } from '@/core/course/dto/create-lesson.dto';
import { UpdateLessonDto } from '@/core/course/dto/update-lesson.dto';
import { CreateTaskDto, TaskQuestionDto } from '@/core/course/dto/create-task.dto';
import { UpdateTaskDto } from '@/core/course/dto/update-task.dto';
import { UpdateTaskQuestionDto } from '@/core/course/dto/update-task-question.dto';

const courseUpload = () =>
  UseInterceptors(FileInterceptor('image', { storage: courseImageStorage, fileFilter: imageFileFilter }));

@Roles(UserRole.ADMIN)
@Controller('admin/courses')
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

  @Get(':courseId/units/:unitId/lessons')
  listLessons(@Param('courseId') courseId: string, @Param('unitId') unitId: string) {
    return this.lessonService.listLessons(courseId, unitId);
  }

  @Post(':courseId/units/:unitId/lessons')
  @UseInterceptors(FileInterceptor('media', { storage: lessonMediaStorage, fileFilter: videoFileFilter }))
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

  @Patch(':courseId/units/:unitId/lessons/:lessonId/media')
  @UseInterceptors(FileInterceptor('media', { storage: lessonMediaStorage, fileFilter: videoFileFilter }))
  uploadLessonMedia(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.lessonService.uploadMedia(courseId, unitId, lessonId, toMediaPath(file.filename));
  }

  @Delete(':courseId/units/:unitId/lessons/:lessonId/media')
  @HttpCode(204)
  deleteLessonMedia(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.lessonService.deleteMedia(courseId, unitId, lessonId);
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

  // ── Task ──────────────────────────────────────────────────────────────────

  @Post(':courseId/units/:unitId/lessons/:lessonId/tasks')
  createTask(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.taskService.createTask(courseId, unitId, lessonId, dto);
  }

  @Get(':courseId/units/:unitId/lessons/:lessonId/tasks')
  listTasks(@Param('courseId') courseId: string, @Param('unitId') unitId: string, @Param('lessonId') lessonId: string) {
    return this.taskService.listTasks(courseId, unitId, lessonId);
  }

  @Patch(':courseId/units/:unitId/lessons/:lessonId/tasks/:taskId')
  updateTask(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(courseId, unitId, lessonId, taskId, dto);
  }

  // ── Task questions ────────────────────────────────────────────────────────
  //
  // Savollar `jsonb` massivda, o'z id'siz saqlanadi — shuning uchun massivdagi
  // o'rni (`index`, 0 dan) bilan belgilanadi. Bitta savolni qo'shish uchun
  // butun massivni qayta yuborish shart emas.

  @Post(':courseId/units/:unitId/lessons/:lessonId/tasks/:taskId/questions')
  addTaskQuestion(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Param('taskId') taskId: string,
    @Body() dto: TaskQuestionDto,
  ) {
    return this.taskService.addQuestion(courseId, unitId, lessonId, taskId, dto);
  }

  @Patch(':courseId/units/:unitId/lessons/:lessonId/tasks/:taskId/questions/:index')
  updateTaskQuestion(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Param('taskId') taskId: string,
    @Param('index', ParseIntPipe) index: number,
    @Body() dto: UpdateTaskQuestionDto,
  ) {
    return this.taskService.updateQuestion(courseId, unitId, lessonId, taskId, index, dto);
  }

  @Delete(':courseId/units/:unitId/lessons/:lessonId/tasks/:taskId/questions/:index')
  deleteTaskQuestion(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Param('taskId') taskId: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.taskService.deleteQuestion(courseId, unitId, lessonId, taskId, index);
  }

  @Patch(':courseId/units/:unitId/lessons/:lessonId/tasks/:taskId/file')
  @UseInterceptors(FileInterceptor('file', { storage: taskContentStorage, fileFilter: taskContentFileFilter }))
  uploadTaskFile(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.taskService.uploadFile(
      courseId,
      unitId,
      lessonId,
      taskId,
      toTaskContentPath(file),
      taskContentTypeOf(file),
    );
  }

  @Delete(':courseId/units/:unitId/lessons/:lessonId/tasks/:taskId')
  @HttpCode(204)
  deleteTask(
    @Param('courseId') courseId: string,
    @Param('unitId') unitId: string,
    @Param('lessonId') lessonId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.deleteTask(courseId, unitId, lessonId, taskId);
  }
}
