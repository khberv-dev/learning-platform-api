import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

/** FCM bitta so'rovda maksimal 500 ta tokenni qabul qiladi. */
const MULTICAST_LIMIT = 500;

/** Shu kodlar token endi yaroqsiz ekanini bildiradi — sessiya o'chiriladi. */
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/** Ilova ichida bitta nomlangan Firebase app — standart app bilan to'qnashmasin. */
const APP_NAME = 'iteach-push';

export interface PushPayload {
  title: string;
  body: string;
  /** Ilova deep-link uchun ishlatadigan qo'shimcha maydonlar — faqat matn. */
  data?: Record<string, string>;
}

export interface PushResult {
  sent: number;
  failed: number;
  /** Ro'yxatdan o'tmagan tokenlar — chaqiruvchi ularni bazadan tozalaydi. */
  deadTokens: string[];
}

const EMPTY_RESULT: PushResult = { sent: 0, failed: 0, deadTokens: [] };

/**
 * FCM transport qatlami: faqat yuborish bilan shug'ullanadi, kimga
 * yuborilishini `PushService` hal qiladi.
 *
 * Xizmat hisobi kaliti `GOOGLE_SERVICES_JSON` da saqlanadi — base64 yoki
 * to'g'ridan-to'g'ri JSON matn sifatida.
 */
@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;
  /** Sozlama yaroqsiz bo'lsa har yuborishda qayta urinilmaydi va log to'lmaydi. */
  private initFailed = false;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Sozlama konstruktorda emas, birinchi yuborishda o'qiladi — Firebase
   * sozlanmagan bo'lsa ham ilova ishga tushaveradi (Eskiz'dagi kabi).
   */
  private getApp(): App | null {
    if (this.app || this.initFailed) return this.app;

    const raw = this.configService.get<string>('GOOGLE_SERVICES_JSON');
    if (!raw?.trim()) {
      this.logger.warn('GOOGLE_SERVICES_JSON sozlanmagan — push xabarnomalar yuborilmaydi');
      this.initFailed = true;
      return null;
    }

    try {
      const credential = this.parseServiceAccount(raw);
      this.app = initializeApp({ credential: cert(credential) }, APP_NAME);
      this.logger.log(`Firebase ulandi (project: ${credential.projectId})`);
      return this.app;
    } catch (error) {
      this.logger.error('GOOGLE_SERVICES_JSON yaroqsiz — push xabarnomalar yuborilmaydi', error as Error);
      this.initFailed = true;
      return null;
    }
  }

  /**
   * Kalit ikki ko'rinishda bo'lishi mumkin: base64 (tavsiya etiladi — `.env`
   * da qator ko'chishi muammosi bo'lmaydi) yoki xom JSON.
   */
  private parseServiceAccount(raw: string): ServiceAccount & { projectId: string } {
    const trimmed = raw.trim();
    const json = trimmed.startsWith('{') ? trimmed : Buffer.from(trimmed, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as { project_id?: string; client_email?: string; private_key?: string };

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error('project_id / client_email / private_key topilmadi');
    }

    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      // `.env` ga yozilganda qator ko'chishi ko'pincha `\n` matniga aylanadi.
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    };
  }

  /**
   * Tokenlarga xabar yuboradi. Push yordamchi funksiya — hech qachon xato
   * otmaydi, chunki xabarnoma yuborilmagani asosiy amalni (yozilish, to'lov)
   * buzmasligi kerak.
   */
  async sendToTokens(tokens: string[], payload: PushPayload): Promise<PushResult> {
    const unique = [...new Set(tokens.filter(Boolean))];
    if (unique.length === 0) return EMPTY_RESULT;

    const app = this.getApp();
    if (!app) return EMPTY_RESULT;

    const result: PushResult = { sent: 0, failed: 0, deadTokens: [] };

    for (let i = 0; i < unique.length; i += MULTICAST_LIMIT) {
      const chunk = unique.slice(i, i + MULTICAST_LIMIT);
      try {
        const response = await getMessaging(app).sendEachForMulticast({
          tokens: chunk,
          notification: { title: payload.title, body: payload.body },
          data: payload.data,
        });

        result.sent += response.successCount;
        result.failed += response.failureCount;

        response.responses.forEach((item, index) => {
          if (item.success) return;
          const code = item.error?.code ?? 'unknown';
          if (DEAD_TOKEN_CODES.has(code)) {
            result.deadTokens.push(chunk[index]);
          } else {
            this.logger.warn(`Push yuborilmadi (${code}): ${item.error?.message ?? ''}`);
          }
        });
      } catch (error) {
        result.failed += chunk.length;
        this.logger.error(`Push yuborishda xato (${chunk.length} ta token)`, error as Error);
      }
    }

    return result;
  }
}
