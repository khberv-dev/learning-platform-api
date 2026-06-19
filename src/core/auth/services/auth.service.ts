import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@/core/user/services/user.service';
import { SignUpRequest } from '@/core/auth/dto/sign-up-request.dto';
import { SignInRequest } from '@/core/auth/dto/sign-in-request.dto';
import { comparePassword, hashPassword } from '@/shared/utils/hash.util';
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
    const existingUser = await this.userService.findByPhoneNumberForAuthWithRoles(data.phoneNumber);

    if (existingUser) {
      if (existingUser.student) {
        throw new BadRequestException('Bu telefon raqam allaqachon ro\'yxatdan o\'tgan');
      }
      if (!(await comparePassword(data.password, existingUser.password))) {
        throw new BadRequestException("Login yoki parol noto'g'ri");
      }
      await this.userService.addStudentRole(existingUser.id);
      const fullUser = await this.userService.findById(existingUser.id);
      return { ...this.issueTokens(existingUser.id), roles: fullUser!.roles };
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await this.userService.save({
      firstName: data.firstName,
      phoneNumber: data.phoneNumber,
      password: passwordHash,
      student: new Student(),
    });

    const fullUser = await this.userService.findById(newUser.id);

    return { ...this.issueTokens(newUser.id), roles: fullUser!.roles };
  }

  async signIn(data: SignInRequest) {
    const user = data.email
      ? await this.userService.findByEmailForAuth(data.email)
      : await this.userService.findByPhoneNumberForAuth(data.phoneNumber);

    if (!user || !(await comparePassword(data.password, user.password))) {
      throw new BadRequestException("Login yoki parol noto'g'ri");
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hisobingiz faol emas');
    }

    const fullUser = await this.userService.findById(user.id);

    return { ...this.issueTokens(user.id), roles: fullUser!.roles };
  }

  refresh(user: Pick<User, 'id'>) {
    return this.issueTokens(user.id);
  }
}
