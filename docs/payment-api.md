# Payment API

Tarif (plan) tanlash, to'lov yaratish va Click orqali to'lash oqimi bo'yicha ilova (mobil / web client) uchun qo'llanma.

- Base URL: `{HOST}/api`
- Ilova endpointlari `Authorization: Bearer <access_token>` sarlavhasini talab qiladi.
- Ilova foydalanuvchisi uchun to'lov turlari ro'yxati **alohida endpoint orqali berilmaydi**. Ular faqat to'lov so'rovi yaratilganda qaytariladi.
- Click webhook'lari (`/api/payment/click/*`) va Payme endpointi (`/api/payment/payme`) — to'lov tizimlari serverlari uchun, token talab qilmaydi.

## Umumiy oqim

```
1. GET  /api/courses/{courseId}/plans
   → kursning faol tariflari (narx, muddat, mentor bor/yo'q)

2. POST /api/payments/request { planId }
   → enrollment (status: created) + payment (status: created) yaratiladi
   → javobda faol to'lov turlari qaytadi

3. PATCH /api/payments/{paymentId}/payment-type { paymentTypeId }
   → tanlangan to'lov turi biriktiriladi, paymentType.url ga o'tkaziladi

4. Foydalanuvchi to'lov tizimida to'laydi:
   Click → POST /api/payment/click/prepare   (provider_payment_id yoziladi)
   Click → POST /api/payment/click/complete  (payment: paid, enrollment: active)

   yoki

   Payme → POST /api/payment/payme  CreateTransaction   (provider_payment_id yoziladi)
   Payme → POST /api/payment/payme  PerformTransaction  (payment: paid, enrollment: active)

5. Ilova GET /api/payments/{id} orqali holatni tekshiradi
```

Admin to'lovlarni faqat **ko'ra oladi** — holatini o'zgartira yoki o'chira olmaydi. To'lov holati faqat Click / Payme webhook'lari orqali o'zgaradi. Click'siz (naqd, o'tkazma) holatlar uchun `POST /api/admin/enrollments` bilan talabani to'g'ridan-to'g'ri yozish kerak.

## Holatlar (statuslar)

### Payment status

| Qiymat | Ma'nosi |
|---|---|
| `created` | To'lov so'rovi yaratilgan, hali to'lanmagan (default) |
| `paid` | To'landi — Click yoki Payme tasdiqladi |
| `cancelled` | Bekor qilingan |

### Enrollment status

| Qiymat | Ma'nosi |
|---|---|
| `created` | To'lov kutilmoqda — kurs kontenti hali ochilmagan (default) |
| `active` | To'langan, `start` / `end` oralig'ida kurs ochiq |
| `cancelled` | Bekor qilingan |

`created` holatidagi yozilishda `start` va `end` — `null`. Ular to'lov tasdiqlanganda to'ldiriladi: `start` = tasdiqlangan vaqt, `end` = `start` + tarifdagi `month`.

---

## 1. Tariflar (plans)

Har bir kursda bir nechta tarif bo'ladi: narx, necha oyga, mentor biriktiriladimi.

```http
GET /api/courses/{courseId}/plans
```

Rol: `STUDENT` / `TEACHER` / `ADMIN`. Faqat `isActive: true` tariflar qaytadi, `month` bo'yicha o'sish tartibida.

**200 OK**

```json
[
  {
    "id": "pl000000-0000-0000-0000-000000000001",
    "title": "Standart",
    "price": 250000,
    "month": 3,
    "hasMentor": false,
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  {
    "id": "pl000000-0000-0000-0000-000000000002",
    "title": "Mentor bilan",
    "price": 700000,
    "month": 6,
    "hasMentor": true,
    "isActive": true
  }
]
```

---

## 2. To'lov so'rovi

```http
POST /api/payments/request
Content-Type: application/json
```

```json
{ "planId": "pl000000-0000-0000-0000-000000000001" }
```

Kurs tarifdan olinadi — alohida `courseId` yuborilmaydi.

Nima bo'ladi:

- kurs uchun `created` holatidagi **enrollment** yaratiladi;
- unga bog'langan `created` holatidagi **payment** yaratiladi (tanlangan tarif bilan);
- javobda faol to'lov turlari qaytariladi.

So'rov **idempotent**: kurs uchun kutilayotgan to'lov mavjud bo'lsa, yangisi yaratilmaydi. Agar boshqa tarif yuborilsa, mavjud kutilayotgan to'lovning tarifi yangilanadi.

**201 Created**

```json
{
  "payment": {
    "id": "pa000000-0000-0000-0000-000000000001",
    "amount": 250000,
    "status": "created",
    "providerPaymentId": null,
    "paymentType": null,
    "plan": {
      "id": "pl000000-0000-0000-0000-000000000001",
      "title": "Standart",
      "price": 250000,
      "month": 3,
      "hasMentor": false
    },
    "user": {
      "id": "f2c8a0e0-1111-2222-3333-444455556666",
      "firstName": "Sevara",
      "lastName": "Karimova"
    },
    "enrollment": {
      "id": "en000000-0000-0000-0000-000000000001",
      "status": "created",
      "start": null,
      "end": null,
      "course": { "id": "c0000000-0000-0000-0000-000000000001", "title": "English A1" }
    },
    "createdAt": "2026-05-18T10:00:00.000Z",
    "updatedAt": "2026-05-18T10:00:00.000Z"
  },
  "paymentTypes": [
    {
      "id": "pt000000-0000-0000-0000-000000000001",
      "icon": "/payment-type/click.png",
      "title": "Click",
      "url": "https://my.click.uz/services/pay?service_id=...",
      "isActive": true
    }
  ]
}
```

`icon` — nisbiy yo'l. To'liq manzil: `{HOST}/public` + `icon`.

### To'lov turi url shabloni

To'lov turining `url` maydoni shablon bo'lib saqlanadi va ilovaga qaytarilishidan oldin shu to'lov ma'lumotlari bilan to'ldiriladi. Shablon:

```
https://my.click.uz/services/pay?merchant_id=62107&service_id=105315&merchant_user_id=$paymentId&transaction_param=$userFullName&amount=$amount
```

qaytariladigan url:

```
https://my.click.uz/services/pay?merchant_id=62107&service_id=105315&merchant_user_id=b74027af-53a4-4d60-8fd7-4aa0ce3d5640&transaction_param=Sevara%20Karimova&amount=250000
```

Qo'llab-quvvatlanadigan o'rin egallovchilar:

| Token | Qiymat |
|---|---|
| `$paymentId` | to'lov (payment) id |
| `$userId` | foydalanuvchi id |
| `$userFullName` | ism va familiya (`firstName lastName`) |
| `$amount` | to'lov summasi so'mda (`payment.amount`) |
| `$amountTiyin` | to'lov summasi **tiyinda** (`payment.amount * 100`) — Payme havolasi uchun |
| `$planId`, `$planTitle`, `$planMonth` | tarif maydonlari |
| `$enrollmentId` | yozilish id |
| `$courseId`, `$courseTitle` | kurs maydonlari |

Qiymatlar `encodeURIComponent` bilan kodlanadi (bo'sh joy → `%20`). Noma'lum `$xxx` tokenlar o'zgarishsiz qoladi, shunda shablondagi xato ko'rinib turadi.

To'ldirish quyidagi javoblarda amalga oshiriladi: `POST /api/payments/request`, `PATCH /api/payments/{id}/payment-type`, `GET /api/payments/me`, `GET /api/payments/{id}`. Admin endpointlari `url` ni **xom shablon** ko'rinishida qaytaradi — tahrirlash uchun.

**Xatolar**

| Kod | Sabab |
|---|---|
| 404 | `Talaba topilmadi` — foydalanuvchida student profili yo'q |
| 404 | `Tarif topilmadi` — tarif mavjud emas yoki faol emas |
| 404 | `Kurs topilmadi` — tarifning kursi faol emas |
| 400 | `Siz allaqachon ushbu kursga yozilgansiz` — kursda `active` yozilish bor |

## 3. To'lov turini tanlash

```http
PATCH /api/payments/{paymentId}/payment-type
Content-Type: application/json
```

```json
{ "paymentTypeId": "pt000000-0000-0000-0000-000000000001" }
```

**200 OK** — `paymentType` to'ldirilgan to'lov qaytadi. Ilova foydalanuvchini `paymentType.url` ga yo'naltiradi.

**Xatolar**

| Kod | Sabab |
|---|---|
| 404 | `To'lov topilmadi` — to'lov yo'q yoki boshqa foydalanuvchiga tegishli |
| 400 | `Yakunlangan to'lovni o'zgartirib bo'lmaydi` — status `created` emas |
| 404 | `To'lov turi topilmadi` |
| 400 | `To'lov turi faol emas` |

## 4. To'lovlarni ko'rish

```http
GET /api/payments/me?page=1&limit=10
GET /api/payments/{paymentId}
```

`GET /api/payments/{paymentId}` faqat o'z to'lovini qaytaradi, aks holda `404`. To'lov o'tganini shu yerdan bilish mumkin:

```json
{
  "id": "pa000000-0000-0000-0000-000000000001",
  "status": "paid",
  "providerPaymentId": "3086492419",
  "plan": { "id": "pl000000-0000-0000-0000-000000000001", "title": "Standart", "month": 3 },
  "enrollment": {
    "id": "en000000-0000-0000-0000-000000000001",
    "status": "active",
    "start": "2026-05-18T10:12:00.000Z",
    "end": "2026-08-18T10:12:00.000Z",
    "course": { "id": "c0000000-0000-0000-0000-000000000001", "title": "English A1" }
  }
}
```

---

## Bog'liq endpointlar

- `GET /api/courses/available` — sotib olish mumkin bo'lgan faol kurslar. Kurs ro'yxatdan **faqat** muddati tugamagan `active` yozilish bo'lganda chiqadi. `created` (to'lov kutilmoqda) va muddati tugagan yozilishlar to'smaydi — ular ro'yxatda qoladi. `created` kursga qayta `POST /api/payments/request` yuborilsa, yangi to'lov yaratilmaydi: mavjud kutilayotgan to'lov qaytariladi.
- Muddati tugagan kurs qayta sotib olinganda **yangi yozilish yaratilmaydi**: mavjud yozilish `created` holatiga qaytadi (`start` / `end` tozalanadi), to'langach yangi muddat bilan `active` bo'ladi va `enrollment_histories` ga navbatdagi yozuv qo'shiladi. Shu tufayli kurs bo'yicha progress saqlanib qoladi.
- `GET /api/courses/me` — **faqat `active`** yozilishlar. To'lov tasdiqlanmaguncha kurs bu ro'yxatda ko'rinmaydi. Har bir yozilishda `totalProgress` va `isExpired` bor.

---

## Click Merchant API

Ikkala endpoint ham Click serverlari tomonidan `application/x-www-form-urlencoded` bilan chaqiriladi, JWT talab qilinmaydi va **doim HTTP 200** qaytaradi — natija javob tanasidagi `error` maydonida.

Sozlamalar (`.env`):

| O'zgaruvchi | Izoh |
|---|---|
| `CLICK_SERVICE_ID` | Click'dagi service id. O'rnatilgan bo'lsa, kelgan `service_id` shu bilan solishtiriladi |
| `CLICK_SECRET_KEY` | `sign_string` ni tekshirish uchun maxfiy kalit. **O'rnatilmasa barcha so'rovlar `-1` bilan rad etiladi** |

Imzo:

```
prepare:  md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
complete: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
```

### 1-bosqich: Prepare

```http
POST /api/payment/click/prepare
```

So'rov maydonlari: `click_trans_id`, `service_id`, `click_paydoc_id`, `merchant_trans_id`, `amount`, `action` (= `0`), `error`, `error_note`, `sign_time`, `sign_string`.

- `merchant_trans_id` — **to'lov (payment) id yoki foydalanuvchi (user) id**. Bu qiymat to'lov sahifasining `transaction_param` parametridan keladi.
  - to'lov id bo'lsa — aniq to'lov topiladi (tavsiya etiladi);
  - kelgan `amount` **`payment.amount`** bilan solishtiriladi — bu to'lov yaratilgan paytdagi tarif narxi. Tarif narxi keyin o'zgarsa ham, kutilayotgan to'lov eski summa bilan yopiladi.
  - foydalanuvchi id bo'lsa — shu foydalanuvchining `created` holatidagi to'lovi topiladi (summasi mos keladigani, bo'lmasa eng oxirgisi).
  - UUID bo'lmasa (masalan Click demo sahifasidagi `Demo`) — `-5` qaytariladi.
- Topilgan to'lovga `providerPaymentId = click_trans_id` yoziladi.

**Javob**

```json
{
  "click_trans_id": "3086492419",
  "merchant_trans_id": "f2c8a0e0-1111-2222-3333-444455556666",
  "merchant_prepare_id": "pa000000-0000-0000-0000-000000000001",
  "error": 0,
  "error_note": "Success"
}
```

`merchant_prepare_id` — **payment id**.

### 2-bosqich: Complete

```http
POST /api/payment/click/complete
```

So'rov maydonlari: prepare'dagilar + `merchant_prepare_id` (= payment id), `action` (= `1`).

- To'lov `merchant_prepare_id` bo'yicha topiladi va `merchant_trans_id` (user id) bilan tekshiriladi.
- To'lov `paid` holatiga o'tadi, yozilish `active` bo'ladi (`start` = hozir, `end` = `start` + tarif `month`), `enrollment_histories` ga yozuv qo'shiladi.

**Javob**

```json
{
  "click_trans_id": "3086492419",
  "merchant_trans_id": "f2c8a0e0-1111-2222-3333-444455556666",
  "merchant_confirm_id": "pa000000-0000-0000-0000-000000000001",
  "error": 0,
  "error_note": "Success"
}
```

`merchant_confirm_id` — **payment id**.

### Xato kodlari

| Kod | Izoh | Qachon |
|---|---|---|
| `0` | Success | Muvaffaqiyatli |
| `-1` | SIGN CHECK FAILED! | `sign_string` mos emas yoki `CLICK_SECRET_KEY` sozlanmagan |
| `-2` | Incorrect parameter amount | `amount` tarif narxiga teng emas |
| `-3` | Action not found | `action` kutilgan qiymat emas (`0` / `1`) |
| `-4` | Already paid | To'lov allaqachon `paid` (takroriy complete) |
| `-5` | User does not exist | `merchant_trans_id` noto'g'ri formatda |
| `-6` | Transaction does not exist | Kutilayotgan to'lov topilmadi yoki `click_trans_id` mos emas |
| `-7` | Failed to update user | Yozilishni faollashtirishda ichki xato |
| `-8` | Error in request from click | Majburiy maydon yo'q yoki `service_id` mos emas |
| `-9` | Transaction cancelled | Click `error < 0` yubordi yoki to'lov bekor qilingan |

`error_note` javobda qaytariladi (Click spetsifikatsiyasidagi standart maydon) — rasmlardagi 4 ta maydondan tashqari, xatolarni tekshirishni osonlashtirish uchun.

---

## Payme (Paycom) Merchant API

Payme barcha metodlarni **bitta** endpointga JSON-RPC 2.0 formatida yuboradi. Javob **doim HTTP 200** — natija javob tanasidagi `result` yoki `error` da.

```http
POST /api/payment/payme
Content-Type: application/json
Authorization: Basic base64("Paycom:<PAYME_MERCHANT_KEY>")
```

Sozlamalar (`.env`):

| O'zgaruvchi | Izoh |
|---|---|
| `PAYME_MERCHANT_KEY` | `Basic` sarlavhasidagi parol. **O'rnatilmasa barcha so'rovlar `-32504` bilan rad etiladi** |
| `PAYME_ACCOUNT_FIELD` | Payme kabinetidagi hisob maydoni nomi; sukut bo'yicha `payment_id` |

Hisob (account) maydonining qiymati — **to'lov (payment) id yoki foydalanuvchi (user) id**, Click'dagi kabi: avval to'lov id sifatida qidiriladi, topilmasa foydalanuvchining kutilayotgan to'lovlaridan summasi mos keladigani olinadi.

**Summa tiyinda.** `payment.amount` so'mda saqlanadi, taqqoslash `payment.amount * 100` bo'yicha bajariladi (250 000 so'm → `25000000`).

> To'lov havolasida ham summa **tiyinda** yuborilishi shart. To'lov turining `url` shablonida `$amount` (so'm) emas, `$amountTiyin` ishlatilsin — aks holda Payme `-31001` (`Summa noto'g'ri`) oladi. Mos kelmagan summa log'ga kutilgan va kelgan qiymat bilan yoziladi.

Tranzaksiya holati alohida `payme_transactions` jadvalida saqlanadi — Payme takroriy so'rovga **aynan o'sha javobni** kutadi.

| `state` | Ma'nosi |
|---|---|
| `1` | Yaratilgan, to'lov kutilmoqda |
| `2` | To'langan |
| `-1` | To'lanmasdan bekor qilingan |
| `-2` | To'langandan keyin bekor qilingan (qaytarim) |

### Metodlar

| Metod | Natija |
|---|---|
| `CheckPerformTransaction` | `{ allow: true }` |
| `CreateTransaction` | `{ create_time, transaction, state }` |
| `PerformTransaction` | `{ transaction, perform_time, state }` |
| `CancelTransaction` | `{ transaction, cancel_time, state }` |
| `CheckTransaction` | `{ create_time, perform_time, cancel_time, transaction, state, reason }` |
| `GetStatement` | `{ transactions: [...] }` |

`transaction` — bizdagi `payme_transactions.id`. Bo'sh vaqtlar `0` bo'lib qaytadi (`null` emas).

So'rov:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "CreateTransaction",
  "params": {
    "id": "5e7301a1b2c3d4e5f6a7b8c9",
    "time": 1786629137480,
    "amount": 25000000,
    "account": { "payment_id": "pa000000-0000-0000-0000-000000000001" }
  }
}
```

Javob:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "create_time": 1786629137480,
    "transaction": "51d041fb-3a8a-43c9-9726-e9ee3e9f26bd",
    "state": 1
  }
}
```

### Xatti-harakati

- `CreateTransaction` **idempotent**: bir xil `id` bilan takror kelsa avvalgi `create_time` qaytadi. Ayni to'lov uchun boshqa `id` bilan kelsa va oldingi tranzaksiya hali kutilayotgan bo'lsa — `-31053`.
- Kutilayotgan tranzaksiya **12 soatdan keyin** avtomatik bekor qilinadi (`state: -1`, `reason: 4`), keyingi `Create` / `Perform` so'rovi `-31008` oladi.
- `PerformTransaction` to'lovni `paid` qiladi, yozilish `active` bo'ladi (`start` = hozir, `end` = `start` + tarif `month`) va `enrollment_histories` ga yozuv qo'shiladi — Click `complete` bilan bir xil.
- `CancelTransaction`:
  - **to'lanmagan** tranzaksiya (`state: 1`) bekor qilinsa — `state: -1`, ammo **to'lov `created` bo'lib qoladi**. Foydalanuvchi to'lovni yarim yo'lda tashlab ketgan bo'lishi mumkin; shu tufayli u qayta urinib ko'radi va yozilishdagi progress saqlanadi;
  - **to'langan** tranzaksiya bekor qilinsa (qaytarim) — `state: -2`, to'lov `cancelled`, yozilish ham `cancelled`.
- To'lov `paid` yoki `cancelled` bo'lgach `CheckPerformTransaction` `-31051` qaytaradi.

### Xato kodlari

| Kod | Qachon |
|---|---|
| `-32504` | `Authorization` sarlavhasi yo'q / kalit mos emas / `PAYME_MERCHANT_KEY` sozlanmagan |
| `-32600` | So'rovda `method` yo'q |
| `-32601` | Noma'lum metod |
| `-32602` | `id`, `time`, `from`, `to` parametrlari yo'q yoki noto'g'ri turda |
| `-31001` | Summa `payment.amount * 100` ga teng emas |
| `-31003` | Tranzaksiya topilmadi |
| `-31008` | Muddati o'tgan yoki holati mos kelmaydigan tranzaksiya |
| `-31050` | Hisobdagi id bo'yicha to'lov topilmadi (`data` — maydon nomi) |
| `-31051` | To'lov allaqachon yakunlangan (`paid` / `cancelled`) |
| `-31052` | Hisob maydoni yo'q yoki UUID emas |
| `-31053` | Ayni to'lovda tugallanmagan tranzaksiya bor (yangi `id` bilan `CreateTransaction`) |

`-31050`..`-31099` — hisob (account) oralig'i. Payme sandbox hisob holati bilan bog'liq xatolarni aynan shu oraliqda kutadi, shuning uchun "boshqa tranzaksiya kutilmoqda" holati `-31008` emas, `-31053` qaytaradi.

Xato xabari uch tilda qaytariladi: `{ "uz": ..., "ru": ..., "en": ... }`.

---

## Admin endpointlari

Rol: `ADMIN`.

### Tariflar

| Method | Route | Izoh |
|---|---|---|
| POST | `/api/admin/courses/{courseId}/plans` | `{ title, price, month, hasMentor?, isActive? }` |
| GET | `/api/admin/courses/{courseId}/plans` | barchasi, nofaollari bilan |
| GET | `/api/admin/courses/{courseId}/plans/{planId}` | bittasi |
| PATCH | `/api/admin/courses/{courseId}/plans/{planId}` | barcha maydonlar ixtiyoriy |
| PATCH | `/api/admin/courses/{courseId}/plans/{planId}/activate` | `isActive = true` |
| PATCH | `/api/admin/courses/{courseId}/plans/{planId}/deactivate` | `isActive = false` |
| DELETE | `/api/admin/courses/{courseId}/plans/{planId}` | `204` |

### To'lovlar

Faqat ko'rish uchun — to'lovni tasdiqlash, bekor qilish yoki o'chirish endpointlari yo'q.

```http
GET /api/admin/payments?page=1&limit=10&status=created&userId=&planId=&paymentTypeId=&enrollmentId=
GET /api/admin/payments/{id}
```

**Xatolar**

| Kod | Sabab |
|---|---|
| 404 | `To'lov topilmadi` |

### Talabani qo'lda yozish (to'lovsiz)

To'lov yaratmasdan, yozilishni darhol `active` holatida ochadi — bepul kirish, naqd to'lov yoki aksiya uchun.

```http
POST /api/admin/enrollments
Content-Type: application/json
```

Tarif bo'yicha (muddat va narx tarifdan olinadi):

```json
{
  "studentId": "f2c8a0e0-1111-2222-3333-444455556666",
  "planId": "pl000000-0000-0000-0000-000000000001"
}
```

Tarifsiz, o'z muddati bilan (bepul):

```json
{
  "studentId": "f2c8a0e0-1111-2222-3333-444455556666",
  "courseId": "c0000000-0000-0000-0000-000000000001",
  "start": "2026-09-01T00:00:00.000Z",
  "end": "2027-03-01T00:00:00.000Z",
  "purchaseAmount": 0
}
```

| Maydon | Izoh |
|---|---|
| `studentId` | majburiy |
| `planId` | kurs, muddat va narx shundan olinadi |
| `courseId` | `planId` berilmasa majburiy; u holda `end` ham majburiy |
| `start` | berilmasa — hozirgi vaqt |
| `end` | berilmasa — `start` + tarifdagi `month` |
| `purchaseAmount` | tarixga yoziladigan summa; berilmasa — tarif narxi, tarif ham bo'lmasa `0` |

Xatti-harakati:

- **to'lov (payment) yozuvi yaratilmaydi** — bu qo'lda berilgan kirish;
- `enrollment_histories` ga yozuv qo'shiladi (bepul bo'lsa summa `0`);
- talabada shu kurs uchun yozilish allaqachon bo'lsa (muddati tugagan yoki to'lov kutayotgan) — **yangisi yaratilmaydi**, mavjudi qayta faollashtiriladi, progress saqlanadi;
- muddati tugamagan faol yozilish bo'lsa — `400 Talaba allaqachon ushbu kursga yozilgan`.

Eski `POST /api/enrollments` yo'li moslik uchun ishlashda davom etadi va aynan shu amalni bajaradi.

### To'lov turlari

| Method | Route | Izoh |
|---|---|---|
| POST | `/api/admin/payment-types` | `multipart/form-data`: `title`, `url`, `isActive?`, `icon?` |
| GET | `/api/admin/payment-types` | barchasi |
| GET | `/api/admin/payment-types/{id}` | bittasi |
| PATCH | `/api/admin/payment-types/{id}` | barcha maydonlar ixtiyoriy |
| DELETE | `/api/admin/payment-types/{id}` | to'lovlari bor turni o'chirib bo'lmaydi (400) |

Yuklangan `icon` fayllar `uploads/payment-type/` ga tushadi va `/public/payment-type/*` orqali beriladi.
