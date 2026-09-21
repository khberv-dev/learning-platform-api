import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { MentorService } from '@/core/user/services/mentor.service';
import { CreateFeedbackDto } from '@/core/user/dto/create-feedback.dto';

@Roles(UserRole.STUDENT)
@Controller('student/mentors')
export class StudentMentorController {
  constructor(private readonly mentorService: MentorService) {}

  @Get()
  findActive() {
    return this.mentorService.findActiveMentors();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mentorService.findOneActiveMentor(id);
  }

  @Post(':id/feedbacks')
  addFeedback(@Param('id') id: string, @Body() dto: CreateFeedbackDto, @CurrentUser() user: { id: string }) {
    return this.mentorService.addFeedback(id, user.id, dto);
  }
}
