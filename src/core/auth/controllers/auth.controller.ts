import { Body, Controller, Ip, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { AuthService } from '@/core/auth/services/auth.service';
import { SignUpRequest } from '@/core/auth/dto/sign-up-request.dto';
import { SignInRequest } from '@/core/auth/dto/sign-in-request.dto';
import { SendOtpDto } from '@/core/auth/dto/send-otp.dto';
import { RecoverPasswordDto } from '@/core/auth/dto/recover-password.dto';
import { Public } from '@/common/decorators/public.decorator';
import { JwtRefreshGuard } from '@/common/guards/jwt-refresh.guard';

const tokenExample = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQifQ.signature',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQifQ.refresh',
  roles: ['student'],
};

const refreshExample = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQifQ.signature',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXV1aWQifQ.refresh',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign-up')
  @ApiCreatedResponse({ schema: { example: tokenExample } })
  signUp(@Body() body: SignUpRequest) {
    return this.authService.signUp(body);
  }

  @Public()
  @Post('sign-in')
  @ApiCreatedResponse({ schema: { example: tokenExample } })
  signIn(@Body() body: SignInRequest) {
    return this.authService.signIn(body);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @ApiCreatedResponse({ schema: { example: refreshExample } })
  refresh(@Request() req) {
    return this.authService.refresh(req.user);
  }

  @Public()
  @Post('otp/send')
  @ApiOperation({
    summary: 'OTP kod yuborish',
    description:
      "`purpose` ixtiyoriy, sukut bo'yicha `registration` — raqam allaqachon talaba sifatida ro'yxatdan o'tgan " +
      "bo'lsa kod yuborilmaydi. Parolni tiklash uchun `recover` yuborilishi shart: u holda bandlik " +
      'tekshirilmaydi, chunki tiklash aynan mavjud raqam uchun ishlaydi.',
  })
  @ApiCreatedResponse({ schema: { example: { message: 'OTP yuborildi' } } })
  @ApiBadRequestResponse({
    description: 'Raqam band (faqat `registration`)',
    schema: { example: { message: "Bu telefon raqam allaqachon ro'yxatdan o'tgan", statusCode: 400 } },
  })
  @ApiTooManyRequestsResponse({
    description: "Bitta raqamga 60 soniyada bir marta va soatiga 5 martadan ko'p kod yuborilmaydi",
    schema: { example: { message: "Yangi kod so'rash uchun 43 soniya kuting", statusCode: 429 } },
  })
  sendOtp(@Body() dto: SendOtpDto, @Ip() ip: string) {
    return this.authService.sendOtp(dto, ip);
  }

  @Public()
  @Post('recover-password')
  @ApiCreatedResponse({ schema: { example: { message: 'Parol yangilandi' } } })
  recoverPassword(@Body() dto: RecoverPasswordDto) {
    return this.authService.recoverPassword(dto);
  }
}
