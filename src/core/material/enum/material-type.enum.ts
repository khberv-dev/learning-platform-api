export enum MaterialType {
  PDF = 'pdf',
  DOC = 'doc',
  /**
   * Eski yozuvlar uchun saqlanadi — ilgari rasm yuklash mumkin edi.
   * Yangi rasm yuklab bo'lmaydi (`material.storage.ts` filtri faqat PDF va
   * Word qabul qiladi). Bu qiymatni enum'dan olib tashlash mavjud yozuvlarni
   * buzadi: `synchronize` ustun turini o'zgartira olmay ilova ishga tushmaydi.
   */
  IMAGE = 'image',
}
