import { Injectable } from '@nestjs/common';
import { EskizService } from '@/core/notification/services/eskiz.service';
import { ResendEmailService } from '@/core/notification/services/resend-email.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly eskizService: EskizService,
    private readonly resendEmailService: ResendEmailService,
  ) {}

  sendSms(phoneNumber: string, message: string): Promise<void> {
    return this.eskizService.sendSms(phoneNumber, message);
  }

  sendOtp(phoneNumber: string, code: string): Promise<void> {
    return this.eskizService.sendSms(phoneNumber, `iTeach ilovasiga kirish uchun kod: ${code}`);
  }

  sendEmailOtp(email: string, code: string): Promise<void> {
    return this.resendEmailService.sendOtp(email, code);
  }
}
