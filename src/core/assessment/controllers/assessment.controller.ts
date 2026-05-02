import { BadRequestException, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { AssessmentService } from '@/core/assessment/services/assessment.service';
import { assessmentInputStorage, audioFileFilter } from '@/core/assessment/storage/assessment.storage';

@ApiTags('assessments')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post()
  @UseInterceptors(FileInterceptor('audio', { storage: assessmentInputStorage, fileFilter: audioFileFilter }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', required: ['audio'], properties: { audio: { type: 'string', format: 'binary' } } },
  })
  create(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { id: string }) {
    if (!file) throw new BadRequestException('Audio fayl yuborilmagan');
    return this.assessmentService.assess(user.id, file);
  }

  @Get('me')
  findMine(@CurrentUser() user: { id: string }) {
    return this.assessmentService.findMine(user.id);
  }
}
