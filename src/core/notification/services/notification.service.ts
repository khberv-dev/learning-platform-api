import { Injectable } from '@nestjs/common';
import { EskizService } from '@/core/notification/services/eskiz.service';

@Injectable()
export class NotificationService {
  constructor(private readonly eskizService: EskizService) {}

  sendSms(phoneNumber: string, message: string): Promise<void> {
    return this.eskizService.sendSms(phoneNumber, message);
  }

  sendOtp(phoneNumber: string, code: string): Promise<void> {
    return this.eskizService.sendSms(phoneNumber, `iTeach ilovasiga kirish uchun kod: ${code}`);
  }
}
