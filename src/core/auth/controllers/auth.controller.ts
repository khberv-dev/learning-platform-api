import { Body, Controller, Get, Ip, Post, Query, Request, UseGuards } from '@nestjs/common';

import { AuthService } from '@/core/auth/services/auth.service';
import { RequestRegistrationOtpDto } from '@/core/auth/dto/request-registration-otp.dto';
import { VerifyRegistrationOtpDto } from '@/core/auth/dto/verify-registration-otp.dto';
import { RegisterDto } from '@/core/auth/dto/register.dto';
import { StudentSignInDto } from '@/core/auth/dto/student-sign-in.dto';
import { MentorSignInDto } from '@/core/auth/dto/mentor-sign-in.dto';
import { AdminSignInDto } from '@/core/auth/dto/admin-sign-in.dto';
import { SendOtpDto } from '@/core/auth/dto/send-otp.dto';
import { RecoverPasswordDto } from '@/core/auth/dto/recover-password.dto';
import { CheckPhoneQuery } from '@/core/auth/dto/check-phone.query';
import { CheckEmailQuery } from '@/core/auth/dto/check-email.query';
import { Public } from '@/common/decorators/public.decorator';
import { JwtRefreshGuard } from '@/common/guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('check-phone')
  checkPhone(@Query() query: CheckPhoneQuery) {
    return this.authService.checkPhoneExists(query.phoneNumber);
  }

  @Public()
  @Get('check-email')
  checkEmail(@Query() query: CheckEmailQuery) {
    return this.authService.checkEmailExists(query.email);
  }

  @Public()
  @Post('register/otp/send')
  sendRegistrationOtp(@Body() dto: RequestRegistrationOtpDto, @Ip() ip: string) {
    return this.authService.requestRegistrationOtp(dto, ip);
  }

  @Public()
  @Post('register/otp/verify')
  verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto) {
    return this.authService.verifyRegistrationOtp(dto);
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
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
