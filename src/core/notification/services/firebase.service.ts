import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const MULTICAST_LIMIT = 500;

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

const APP_NAME = 'iteach-push';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushResult {
  sent: number;
  failed: number;
  deadTokens: string[];
}

const EMPTY_RESULT: PushResult = { sent: 0, failed: 0, deadTokens: [] };

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;
  private initFailed = false;

  constructor(private readonly configService: ConfigService) {}

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
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    };
  }

  isConfigured(): boolean {
    return this.getApp() !== null;
  }

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
