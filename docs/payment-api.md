# Payment API

Tarif (plan) tanlash, to'lov yaratish va Click orqali to'lash oqimi bo'yicha ilova (mobil / web client) uchun qo'llanma.

- Base URL: `{HOST}/api`
- Ilova endpointlari `Authorization: Bearer <access_token>` sarlavhasini talab qiladi.
- Ilova foydalanuvchisi uchun to'lov turlari ro'yxati **alohida endpoint orqali berilmaydi**. Ular faqat to'lov so'rovi yaratilganda qaytariladi.
- Click webhook'lari (`/api/payment/click/*`) — Click serverlari uchun, token talab qilmaydi.

## Umumiy oqim

```
1. GET  /api/courses/{courseId}/plans
   → kursning faol tariflari (narx, muddat, mentor bor/yo'q)

2. POST /api/payments/request { planId }
   → enrollment (status: created) + payment (status: created) yaratiladi
   → javobda faol to'lov turlari qaytadi

3. PATCH /api/payments/{paymentId}/payment-type { paymentTypeId }
   → tanlangan to'lov turi biriktiriladi, paymentType.url ga o'tkaziladi

4. Foydalanuvchi Click'da to'laydi:
   Click → POST /api/payment/click/prepare   (provider_payment_id yoziladi)
   Click → POST /api/payment/click/complete  (payment: paid, enrollment: active)

5. Ilova GET /api/payments/{id} orqali holatni tekshiradi
```

Admin to'lovni qo'lda ham tasdiqlashi mumkin (`PATCH /api/admin/payments/{id}/status`) — Click'siz (naqd, o'tkazma) to'lovlar uchun.

## Holatlar (statuslar)

### Payment status

| Qiymat | Ma'nosi |
|---|---|
| `created` | To'lov so'rovi yaratilgan, hali to'lanmagan (default) |
| `paid` | To'landi — Click tasdiqladi yoki admin qo'lda tasdiqladi |
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
| `$amount` | tarif narxi |
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

- `GET /api/courses/available` — foydalanuvchida `created` yoki `active` yozilishi bo'lmagan faol kurslar. To'lov so'rovi yaratilgach kurs bu ro'yxatdan chiqadi.
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

- `merchant_trans_id` — **user id**.
- Shu foydalanuvchining `created` holatidagi to'lovi topiladi (summasi mos keladigani, bo'lmasa eng oxirgisi).
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

```http
GET /api/admin/payments?page=1&limit=10&status=created&userId=&planId=&paymentTypeId=&enrollmentId=
GET /api/admin/payments/{id}
DELETE /api/admin/payments/{id}
```

### To'lovni qo'lda tasdiqlash / bekor qilish

```http
PATCH /api/admin/payments/{id}/status
```

```json
{ "status": "paid" }
```

`start` va `end` ixtiyoriy: berilmasa `start` = hozir, `end` = `start` + tarifdagi `month`. Kerak bo'lsa qo'lda berish mumkin:

```json
{ "status": "paid", "start": "2026-05-18T00:00:00.000Z", "end": "2026-08-18T00:00:00.000Z" }
```

Bekor qilish: `{ "status": "cancelled" }` — payment va enrollment `cancelled` bo'ladi.

**Xatolar**

| Kod | Sabab |
|---|---|
| 400 | `To'lov holati allaqachon yakunlangan` |
| 400 | `To'lov holati faqat 'paid' yoki 'cancelled' bo'lishi mumkin` |
| 400 | `Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak` |
| 404 | `To'lov topilmadi` |

### To'lov turlari

| Method | Route | Izoh |
|---|---|---|
| POST | `/api/admin/payment-types` | `multipart/form-data`: `title`, `url`, `isActive?`, `icon?` |
| GET | `/api/admin/payment-types` | barchasi |
| GET | `/api/admin/payment-types/{id}` | bittasi |
| PATCH | `/api/admin/payment-types/{id}` | barcha maydonlar ixtiyoriy |
| DELETE | `/api/admin/payment-types/{id}` | to'lovlari bor turni o'chirib bo'lmaydi (400) |

Yuklangan `icon` fayllar `uploads/payment-type/` ga tushadi va `/public/payment-type/*` orqali beriladi.
