import { Body, Controller, Ip, Post, Request, UseGuards } from '@nestjs/common';

import { AuthService } from '@/core/auth/services/auth.service';
import { SignUpRequest } from '@/core/auth/dto/sign-up-request.dto';
import { StudentSignInDto } from '@/core/auth/dto/student-sign-in.dto';
import { MentorSignInDto } from '@/core/auth/dto/mentor-sign-in.dto';
import { AdminSignInDto } from '@/core/auth/dto/admin-sign-in.dto';
import { SendOtpDto } from '@/core/auth/dto/send-otp.dto';
import { RecoverPasswordDto } from '@/core/auth/dto/recover-password.dto';
import { Public } from '@/common/decorators/public.decorator';
import { JwtRefreshGuard } from '@/common/guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign-up')
  signUp(@Body() body: SignUpRequest) {
    return this.authService.signUp(body);
  }

  @Public()
  @Post('student/sign-in')
  signInStudent(@Body() body: StudentSignInDto) {
    return this.authService.signInStudent(body);
  }

  @Public()
  @Post('mentor/sign-in')
  signInMentor(@Body() body: MentorSignInDto) {
    return this.authService.signInMentor(body);
  }

  @Public()
  @Post('admin/sign-in')
  signInAdmin(@Body() body: AdminSignInDto) {
    return this.authService.signInAdmin(body);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Request() req) {
    return this.authService.refresh(req.user);
  }

  @Public()
  @Post('otp/send')
  sendOtp(@Body() dto: SendOtpDto, @Ip() ip: string) {
    return this.authService.sendOtp(dto, ip);
  }

  @Public()
  @Post('recover-password')
  recoverPassword(@Body() dto: RecoverPasswordDto) {
    return this.authService.recoverPassword(dto);
  }
}
