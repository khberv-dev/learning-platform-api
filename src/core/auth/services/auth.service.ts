import { randomInt } from 'crypto';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { UserService } from '@/core/user/services/user.service';
import { SignUpRequest } from '@/core/auth/dto/sign-up-request.dto';
import { StudentSignInDto } from '@/core/auth/dto/student-sign-in.dto';
import { MentorSignInDto } from '@/core/auth/dto/mentor-sign-in.dto';
import { AdminSignInDto } from '@/core/auth/dto/admin-sign-in.dto';
import { SendOtpDto } from '@/core/auth/dto/send-otp.dto';
import { OtpPurpose } from '@/core/auth/enum/otp-purpose.enum';
import { RecoverPasswordDto } from '@/core/auth/dto/recover-password.dto';
import { Otp } from '@/core/auth/entity/otp.entity';
import { comparePassword, hashPassword } from '@/shared/utils/hash.util';
import { NotificationService } from '@/core/notification/services/notification.service';
import { SlidingWindowLimiter } from '@/core/auth/utils/sliding-window-limiter';
import { isDevelopment } from '@/shared/config/environment.config';
import { UserRole } from '@/core/user/enum/user-role.enum';
import type { AuthUser } from '@/common/utils/role-owner.util';

const OTP_TTL_MS = 5 * 60 * 1000;

const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_PER_RECIPIENT_PER_HOUR = 5;
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const HOUR_MS = 60 * 60 * 1000;

function generateOtpCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

const DEVELOPMENT_OTP_CODE = '666666';

type AuthIdentity = { phoneNumber: string; email?: never } | { phoneNumber?: never; email: string };

function resolveIdentity(input: { phoneNumber?: string; email?: string }): AuthIdentity {
  if (!!input.phoneNumber === !!input.email) {
    throw new BadRequestException('Faqat email yoki telefon raqamdan bittasini yuboring');
  }
  if (input.email) return { email: input.email.trim().toLowerCase() };
  return { phoneNumber: input.phoneNumber! };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    @InjectRepository(Otp) private readonly otpRepo: Repository<Otp>,
  ) {
    const perIp = Number(this.configService.get<string>('OTP_MAX_PER_IP_PER_HOUR'));
    this.ipLimiter = Number.isFinite(perIp) && perIp > 0 ? new SlidingWindowLimiter(perIp, HOUR_MS) : null;
    this.isDevelopment = isDevelopment(this.configService);
  }

  private readonly ipLimiter: SlidingWindowLimiter | null;
  private readonly isDevelopment: boolean;

  issueTokens(id: string, role: UserRole) {
    const payload = { sub: id, role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow('JWT_REFRESH_EXPIRE'),
    });

    return { accessToken, refreshToken };
  }

  private async consumeOtp(identity: AuthIdentity, code: string, purpose: OtpPurpose): Promise<void> {
    const otp = await this.otpRepo.findOne({
      where: { ...identity, purpose, used: false },
      order: { createdAt: 'DESC' },
    });
    if (!otp || otp.expiresAt < new Date() || otp.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      if (otp && !otp.used) await this.otpRepo.update({ id: otp.id, used: false }, { used: true });
      throw new BadRequestException("OTP noto'g'ri yoki muddati o'tgan");
    }

    if (otp.code !== code) {
      const attempts = otp.attempts + 1;
      await this.otpRepo.update({ id: otp.id, used: false }, { attempts, used: attempts >= OTP_MAX_VERIFY_ATTEMPTS });
      throw new BadRequestException("OTP noto'g'ri yoki muddati o'tgan");
    }

    const consumed = await this.otpRepo.update({ id: otp.id, used: false }, { used: true });
    if (!consumed.affected) throw new BadRequestException("OTP noto'g'ri yoki muddati o'tgan");
  }

  async signUp(data: SignUpRequest) {
    const identity = resolveIdentity(data);
    await this.consumeOtp(identity, data.code, OtpPurpose.REGISTRATION);

    const taken = identity.email
      ? await this.userService.hasStudentProfileByEmail(identity.email)
      : await this.userService.hasStudentProfile(identity.phoneNumber!);
    if (taken) {
      throw new BadRequestException(
        identity.email ? "Bu email allaqachon ro'yxatdan o'tgan" : "Bu telefon raqam allaqachon ro'yxatdan o'tgan",
      );
    }

    const passwordHash = await hashPassword(data.password);

    const student = await this.userService.createStudent({
      firstName: data.firstName,
      lastName: data.lastName,
      ...identity,
      password: passwordHash,
      level: data.level,
    });

    return { ...this.issueTokens(student.id, UserRole.STUDENT), role: UserRole.STUDENT };
  }

  private async finishSignIn(
    account: { id: string; password: string; isActive: boolean } | null,
    password: string,
    role: UserRole,
  ) {
    if (!account || !(await comparePassword(password, account.password))) {
      throw new BadRequestException("Login yoki parol noto'g'ri");
    }

    if (!account.isActive) {
      throw new UnauthorizedException('Hisobingiz faol emas');
    }

    return { ...this.issueTokens(account.id, role), role };
  }

  async signInStudent(data: StudentSignInDto) {
    const identity = resolveIdentity(data);
    const account = await this.userService.findStudentForAuth(identity);
    return this.finishSignIn(account, data.password, UserRole.STUDENT);
  }

  async signInMentor(data: MentorSignInDto) {
    const account = await this.userService.findMentorForAuth(data.phoneNumber);
    return this.finishSignIn(account, data.password, UserRole.MENTOR);
  }

  async signInAdmin(data: AdminSignInDto) {
    const account = await this.userService.findAdminForAuth(data.email);
    return this.finishSignIn(account, data.password, UserRole.ADMIN);
  }

  refresh(user: Pick<AuthUser, 'id' | 'role'>) {
    return this.issueTokens(user.id, user.role);
  }

  private async assertOtpAllowed(identity: AuthIdentity, ip?: string): Promise<void> {
    if (ip && this.ipLimiter?.hit(ip)) {
      throw new HttpException("Juda ko'p so'rov yuborildi, keyinroq urinib ko'ring", HttpStatus.TOO_MANY_REQUESTS);
    }

    const last = await this.otpRepo.findOne({ where: identity, order: { createdAt: 'DESC' } });
    if (last) {
      const elapsed = Date.now() - last.createdAt.getTime();
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new HttpException(`Yangi kod so'rash uchun ${wait} soniya kuting`, HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    const sentLastHour = await this.otpRepo.count({
      where: { ...identity, createdAt: MoreThan(new Date(Date.now() - HOUR_MS)) },
    });
    if (sentLastHour >= OTP_MAX_PER_RECIPIENT_PER_HOUR) {
      throw new HttpException(
        "Kod so'rashlar soni oshib ketdi, bir soatdan keyin urinib ko'ring",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async sendOtp(dto: SendOtpDto, ip?: string): Promise<{ message: string }> {
    const identity = resolveIdentity(dto);
    await this.assertOtpAllowed(identity, ip);

    if (dto.purpose === OtpPurpose.REGISTRATION) {
      const hasStudent = identity.email
        ? await this.userService.hasStudentProfileByEmail(identity.email)
        : await this.userService.hasStudentProfile(identity.phoneNumber!);
      if (hasStudent) {
        throw new BadRequestException(
          identity.email ? "Bu email allaqachon ro'yxatdan o'tgan" : "Bu telefon raqam allaqachon ro'yxatdan o'tgan",
        );
      }
    }

    const code = this.isDevelopment ? DEVELOPMENT_OTP_CODE : generateOtpCode();

    if (identity.email) {
      await this.notificationService.sendEmailOtp(identity.email, code);
    } else {
      await this.notificationService.sendOtp(identity.phoneNumber!, code);
    }

    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await this.otpRepo.update({ ...identity, purpose: dto.purpose, used: false }, { used: true });
    await this.otpRepo.save({ ...identity, code, purpose: dto.purpose, expiresAt, used: false, attempts: 0 });

    return { message: 'OTP yuborildi' };
  }

  async recoverPassword(dto: RecoverPasswordDto): Promise<{ message: string }> {
    const identity = resolveIdentity(dto);
    await this.consumeOtp(identity, dto.code, OtpPurpose.RECOVER);

    const account = await this.userService.findAccountForAuth(identity);
    if (!account) throw new NotFoundException('Foydalanuvchi topilmadi');

    await this.userService.setPassword(account.id, dto.newPassword);

    return { message: 'Parol yangilandi' };
  }
}
