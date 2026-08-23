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
import { OtpPurpose } from '@/core/auth/enum/otp-purpose.enum';
import { RecoverPasswordDto } from '@/core/auth/dto/recover-password.dto';
import { Otp } from '@/core/auth/entity/otp.entity';
import { comparePassword, hashPassword } from '@/shared/utils/hash.util';
import { buildStudent } from '@/core/user/entity/student.entity';
import { User } from '@/core/user/entity/user.entity';
import { NotificationService } from '@/core/notification/services/notification.service';
import { SlidingWindowLimiter } from '@/core/auth/utils/sliding-window-limiter';
import { isDevelopment } from '@/shared/config/environment.config';

const OTP_TTL_MS = 5 * 60 * 1000;

/** Bitta telefon yoki emailga ketma-ket kod so'rashlar orasidagi eng kam vaqt. */
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
/** Bitta telefon yoki emailga bir soatda yuboriladigan maksimal kod soni. */
const OTP_MAX_PER_RECIPIENT_PER_HOUR = 5;
const OTP_MAX_VERIFY_ATTEMPTS = 5;
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

    const existingUser = identity.email
      ? await this.userService.findByEmailForAuthWithRoles(identity.email)
      : await this.userService.findByPhoneNumberForAuthWithRoles(identity.phoneNumber!);

    if (existingUser) {
      if (existingUser.student) {
        throw new BadRequestException(
          identity.email ? "Bu email allaqachon ro'yxatdan o'tgan" : "Bu telefon raqam allaqachon ro'yxatdan o'tgan",
        );
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
      ...identity,
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
    // Chastota cheklovi bandlik tekshiruvidan oldin: aks holda raqamlarni
    // birma-bir tekshirib, qaysi biri ro'yxatdan o'tganini bepul aniqlash
    // mumkin bo'lardi.
    await this.assertOtpAllowed(identity, ip);

    // Ro'yxatdan o'tish uchun band raqamga kod yuborilmaydi. Parolni tiklashda
    // tekshirilmaydi — u aynan mavjud raqam uchun ishlaydi.
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

    // Avval xabar yuboriladi: yuborilmasa, foydalanuvchi ololmaydigan kod
    // bazada qolib ketmaydi.
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

    const user = identity.email
      ? await this.userService.findByEmail(identity.email)
      : await this.userService.findByPhoneNumber(identity.phoneNumber!);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const passwordHash = await hashPassword(dto.newPassword);
    await this.userService.updatePassword(user.id, passwordHash);

    return { message: 'Parol yangilandi' };
  }
}
