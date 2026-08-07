/**
 * Oddiy xotiradagi sirpanuvchi oyna hisoblagichi.
 *
 * Bitta instansiya doirasida ishlaydi va qayta ishga tushganda tozalanadi —
 * shuning uchun faqat qo'shimcha himoya sifatida ishlatiladi, asosiy cheklov
 * bazadagi OTP yozuvlariga tayanadi.
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Urinishni qayd etadi. `true` — limitdan oshgan (urinish hisoblanmaydi). */
  hit(key: string, now = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const times = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (times.length >= this.limit) {
      this.hits.set(key, times);
      return true;
    }

    times.push(now);
    this.hits.set(key, times);

    // Map cheksiz o'smasligi uchun vaqti-vaqti bilan tozalanadi.
    if (this.hits.size > 500) this.prune(cutoff);

    return false;
  }

  private prune(cutoff: number): void {
    for (const [key, times] of this.hits) {
      const kept = times.filter((t) => t > cutoff);
      if (kept.length === 0) this.hits.delete(key);
      else this.hits.set(key, kept);
    }
  }
}
