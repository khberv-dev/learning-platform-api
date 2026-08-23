import { Body, Controller, Ip, Post, Request, UseGuards } from '@nestjs/common';

import { AuthService } from '@/core/auth/services/auth.service';
import { SignUpRequest } from '@/core/auth/dto/sign-up-request.dto';
import { SignInRequest } from '@/core/auth/dto/sign-in-request.dto';
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
  @Post('sign-in')
  signIn(@Body() body: SignInRequest) {
    return this.authService.signIn(body);
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
