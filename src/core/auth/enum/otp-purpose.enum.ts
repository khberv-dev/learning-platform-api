/**
 * Kod nima uchun so'ralayotgani. Bitta endpoint ikkala oqimga xizmat qiladi,
 * lekin tekshiruvlar har xil: ro'yxatdan o'tishda raqam bo'sh bo'lishi kerak,
 * parolni tiklashda esa aksincha — mavjud raqam uchun so'raladi.
 */
export enum OtpPurpose {
  REGISTRATION = 'registration',
  RECOVER = 'recover',
}
