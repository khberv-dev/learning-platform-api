import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from '@/core/auth/services/auth.service';
import { SignUpRequest } from '@/core/auth/dto/sign-up-request.dto';
import { SignInRequest } from '@/core/auth/dto/sign-in-request.dto';
import { Public } from '@/common/decorators/public.decorator';
import { JwtRefreshGuard } from '@/common/guards/jwt-refresh.guard';

@ApiTags('auth')
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
  @ApiBearerAuth()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Request() req) {
    return this.authService.refresh(req.user);
  }
}
