import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@/core/user/service/user.service';
import { SignUpRequest } from '@/core/auth/dto/sign-up-request.dto';
import { SignInRequest } from '@/core/auth/dto/sign-in-request.dto';
import { hashPassword, comparePassword } from '@/shared/util/hash.util';
import { Student } from '@/core/user/entity/student.entity';
import { User } from '@/core/user/entity/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  issueTokens(userId: string) {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow('JWT_REFRESH_EXPIRE'),
    });

    return { accessToken, refreshToken };
  }

  async signUp(data: SignUpRequest) {
    const existingUser = await this.userService.findByPhoneNumber(data.phoneNumber);

    if (existingUser) {
      throw new BadRequestException('Boshqa telefon raqam kiriting');
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await this.userService.save({
      firstName: data.firstName,
      phoneNumber: data.phoneNumber,
      password: passwordHash,
      student: new Student(),
    });

    return this.issueTokens(newUser.id);
  }

  async signIn(data: SignInRequest) {
    const user = await this.userService.findByPhoneNumber(data.phoneNumber);

    if (!user || !(await comparePassword(data.password, user.password))) {
      throw new UnauthorizedException('Telefon raqam yoki parol noto\'g\'ri');
    }

    return this.issueTokens(user.id);
  }

  refresh(user: Pick<User, 'id'>) {
    return this.issueTokens(user.id);
  }
}
