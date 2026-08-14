import { ConfigService } from '@nestjs/config';

/** Ilova ishlayotgan muhit — `.env` dagi `ENVIRONMENT`. */
export enum AppEnvironment {
  DEVELOPMENT = 'DEVELOPMENT',
  DEPLOYMENT = 'DEPLOYMENT',
}

/**
 * Muhitni aniqlaydi. Noma'lum yoki bo'sh qiymatda **DEPLOYMENT** qaytadi:
 * sozlama unutilib qolsa, ilova xavfsiz tomonga og'adi (tasodifiy OTP,
 * SMS yoqilgan, batafsil log o'chiq). Aks holda `ENVIRONMENT` yozilmagan
 * serverda OTP hammaga ma'lum kodga aylanib qolardi.
 */
export function resolveEnvironment(value: string | undefined): AppEnvironment {
  return value?.trim().toUpperCase() === AppEnvironment.DEVELOPMENT
    ? AppEnvironment.DEVELOPMENT
    : AppEnvironment.DEPLOYMENT;
}

export function getEnvironment(configService: ConfigService): AppEnvironment {
  return resolveEnvironment(configService.get<string>('ENVIRONMENT'));
}

/** Ishlab chiqish muhitimi — SMS, OTP va log xatti-harakati shunga bog'liq. */
export function isDevelopment(configService: ConfigService): boolean {
  return getEnvironment(configService) === AppEnvironment.DEVELOPMENT;
}
