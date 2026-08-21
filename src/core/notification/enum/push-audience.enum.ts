/**
 * Qo'lda yuboriladigan push kimga boradi.
 *
 * `phones` — aniq raqamlar ro'yxati (bitta yoki bir nechta foydalanuvchi),
 * qolganlari — ommaviy yuborish.
 */
export enum PushAudience {
  /** Ilova o'rnatilgan barcha qurilmalar — rol ajratilmaydi. */
  ALL = 'all',
  STUDENTS = 'students',
  TEACHERS = 'teachers',
  PHONES = 'phones',
}
