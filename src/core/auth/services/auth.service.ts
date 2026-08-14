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
import { SignInRequest } from '@/core/auth/dto/sign-in-request.dto';
import { SendOtpDto } from '@/core/auth/dto/send-otp.dto';
import { RecoverPasswordDto } from '@/core/auth/dto/recover-password.dto';
import { Otp } from '@/core/auth/entity/otp.entity';
import { comparePassword, hashPassword } from '@/shared/utils/hash.util';
import { buildStudent } from '@/core/user/entity/student.entity';
import { User } from '@/core/user/entity/user.entity';
import { NotificationService } from '@/core/notification/services/notification.service';
import { SlidingWindowLimiter } from '@/core/auth/utils/sliding-window-limiter';
import { isDevelopment } from '@/shared/config/environment.config';

const OTP_TTL_MS = 5 * 60 * 1000;

/** Bitta raqamga ketma-ket kod so'rashlar orasidagi eng kam vaqt. */
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
/** Bitta raqamga bir soatda yuboriladigan maksimal kod soni. */
const OTP_MAX_PER_PHONE_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

/** 100000–999999 oralig'idagi 6 xonali kod (crypto — bashorat qilib bo'lmaydi). */
function generateOtpCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

/**
 * DEVELOPMENT muhitida SMS yuborilmaydi, shuning uchun kod doimiy bo'ladi —
 * aks holda ro'yxatdan o'tishni sinab ko'rib bo'lmaydi.
 */
const DEVELOPMENT_OTP_CODE = '666666';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    @InjectRepository(Otp) private readonly otpRepo: Repository<Otp>,
  ) {
    // IP bo'yicha cheklov ixtiyoriy: reverse proxy ortida `trust proxy`
    // sozlanmagan bo'lsa, barcha so'rovlar bitta IP dek ko'rinadi va haqiqiy
    // foydalanuvchilarni bloklab qo'yishi mumkin. Shuning uchun faqat
    // OTP_MAX_PER_IP_PER_HOUR berilganda yoqiladi.
    const perIp = Number(this.configService.get<string>('OTP_MAX_PER_IP_PER_HOUR'));
    this.ipLimiter = Number.isFinite(perIp) && perIp > 0 ? new SlidingWindowLimiter(perIp, HOUR_MS) : null;
    this.isDevelopment = isDevelopment(this.configService);
  }

  private readonly ipLimiter: SlidingWindowLimiter | null;
  private readonly isDevelopment: boolean;

  issueTokens(userId: string) {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow('JWT_REFRESH_EXPIRE'),
    });

    return { accessToken, refreshToken };
  }

  private async consumeOtp(phoneNumber: string, code: string): Promise<void> {
    const otp = await this.otpRepo.findOne({
      where: { phoneNumber, code, used: false },
      order: { createdAt: 'DESC' },
    });
    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException("OTP noto'g'ri yoki muddati o'tgan");
    }
    await this.otpRepo.update(otp.id, { used: true });
  }

  async signUp(data: SignUpRequest) {
    await this.consumeOtp(data.phoneNumber, data.code);

    const existingUser = await this.userService.findByPhoneNumberForAuthWithRoles(data.phoneNumber);

    if (existingUser) {
      if (existingUser.student) {
        throw new BadRequestException("Bu telefon raqam allaqachon ro'yxatdan o'tgan");
      }
      if (!(await comparePassword(data.password, existingUser.password))) {
        throw new BadRequestException("Login yoki parol noto'g'ri");
      }
      await this.userService.addStudentRole(existingUser.id, data.level);
      const fullUser = await this.userService.findById(existingUser.id);
      return { ...this.issueTokens(existingUser.id), roles: fullUser!.roles };
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await this.userService.save({
      firstName: data.firstName,
      phoneNumber: data.phoneNumber,
      password: passwordHash,
      student: buildStudent(data.level),
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

  /**
   * Kod so'rash chastotasini cheklaydi — SMS byudjetini himoya qilish va
   * takroriy so'rovlar bilan raqamni "bombardimon" qilishning oldini olish uchun.
   */
  private async assertOtpAllowed(phoneNumber: string, ip?: string): Promise<void> {
    if (ip && this.ipLimiter?.hit(ip)) {
      throw new HttpException("Juda ko'p so'rov yuborildi, keyinroq urinib ko'ring", HttpStatus.TOO_MANY_REQUESTS);
    }

    const last = await this.otpRepo.findOne({ where: { phoneNumber }, order: { createdAt: 'DESC' } });
    if (last) {
      const elapsed = Date.now() - last.createdAt.getTime();
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new HttpException(`Yangi kod so'rash uchun ${wait} soniya kuting`, HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    const sentLastHour = await this.otpRepo.count({
      where: { phoneNumber, createdAt: MoreThan(new Date(Date.now() - HOUR_MS)) },
    });
    if (sentLastHour >= OTP_MAX_PER_PHONE_PER_HOUR) {
      throw new HttpException(
        "Kod so'rashlar soni oshib ketdi, bir soatdan keyin urinib ko'ring",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async sendOtp(dto: SendOtpDto, ip?: string): Promise<{ message: string }> {
    await this.assertOtpAllowed(dto.phoneNumber, ip);

    const code = this.isDevelopment ? DEVELOPMENT_OTP_CODE : generateOtpCode();

    // Avval SMS yuboriladi: yuborilmasa, foydalanuvchi ololmaydigan kod
    // bazada qolib ketmaydi.
    await this.notificationService.sendOtp(dto.phoneNumber, code);

    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await this.otpRepo.save({ phoneNumber: dto.phoneNumber, code, expiresAt, used: false });

    return { message: 'OTP yuborildi' };
  }

  async recoverPassword(dto: RecoverPasswordDto): Promise<{ message: string }> {
    await this.consumeOtp(dto.phoneNumber, dto.code);

    const user = await this.userService.findByPhoneNumber(dto.phoneNumber);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const passwordHash = await hashPassword(dto.newPassword);
    await this.userService.updatePassword(user.id, passwordHash);

    return { message: 'Parol yangilandi' };
  }
}
