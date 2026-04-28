import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '@/core/auth/auth.service';
import { SignUpRequest } from '@/core/auth/dto/sign-up-request.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  signUp(@Body() body: SignUpRequest) {
    return this.authService.signUp(body);
  }
}
