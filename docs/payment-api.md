# Payment API

To'lov oqimi bo'yicha ilova (mobil / web client) uchun qo'llanma.

- Base URL: `{HOST}/api`
- Barcha so'rovlar `Authorization: Bearer <access_token>` sarlavhasini talab qiladi.
- Ilova foydalanuvchisi uchun to'lov turlari ro'yxati **alohida endpoint orqali berilmaydi**. Ular faqat kurs uchun to'lov so'rovi yaratilganda qaytariladi.

## Umumiy oqim

```
1. POST /api/payments/request { courseId }
   → enrollment (status: created) + payment (status: created) yaratiladi
   → javobda faol to'lov turlari qaytadi

2. PATCH /api/payments/{paymentId}/payment-type { paymentTypeId }
   → foydalanuvchi tanlagan to'lov turi to'lovga biriktiriladi
   → javobdagi paymentType.url ga o'tkaziladi (tashqi to'lov sahifasi)

3. Foydalanuvchi tashqarida to'laydi

4. Admin to'lovni tasdiqlaydi (PATCH /api/admin/payments/{id}/status)
   → payment: paid, enrollment: active (start / end sanalari bilan)

5. Ilova GET /api/payments/{id} yoki GET /api/payments/me orqali holatni tekshiradi
```

## Holatlar (statuslar)

### Payment status

| Qiymat | Ma'nosi |
|---|---|
| `created` | To'lov so'rovi yaratilgan, hali tasdiqlanmagan (default) |
| `paid` | Admin tomonidan tasdiqlangan |
| `cancelled` | Bekor qilingan |

### Enrollment status

| Qiymat | Ma'nosi |
|---|---|
| `created` | To'lov kutilmoqda — kurs kontenti hali ochilmagan (default) |
| `active` | To'lov tasdiqlangan, `start` / `end` oralig'ida kurs ochiq |
| `cancelled` | Bekor qilingan |

`created` holatidagi yozilishda `start` va `end` — `null`. Ular faqat to'lov tasdiqlanganda to'ldiriladi.

---

## Ilova (student) endpointlari

Rol: `STUDENT`.

### 1. Kurs uchun to'lov so'rovi

```http
POST /api/payments/request
Content-Type: application/json
```

```json
{ "courseId": "c0000000-0000-0000-0000-000000000001" }
```

Nima bo'ladi:

- kurs uchun `created` holatidagi **enrollment** yaratiladi;
- unga bog'langan `created` holatidagi **payment** yaratiladi;
- javobda faol to'lov turlari (`isActive: true`) qaytariladi.

So'rov **idempotent**: agar ushbu kurs uchun allaqachon kutilayotgan (`created`) yozilish va to'lov bo'lsa, yangisi yaratilmaydi — mavjudi qaytariladi.

**201 Created**

```json
{
  "payment": {
    "id": "pa000000-0000-0000-0000-000000000001",
    "status": "created",
    "paymentType": null,
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
      "course": {
        "id": "c0000000-0000-0000-0000-000000000001",
        "title": "English A1",
        "price": 250000
      }
    },
    "createdAt": "2026-05-18T10:00:00.000Z",
    "updatedAt": "2026-05-18T10:00:00.000Z"
  },
  "paymentTypes": [
    {
      "id": "pt000000-0000-0000-0000-000000000001",
      "icon": "/payment-type/payme.png",
      "title": "Payme",
      "url": "https://payme.uz/checkout",
      "isActive": true
    },
    {
      "id": "pt000000-0000-0000-0000-000000000002",
      "icon": "/payment-type/click.png",
      "title": "Click",
      "url": "https://click.uz/pay",
      "isActive": true
    }
  ]
}
```

`icon` — nisbiy yo'l. To'liq manzil: `{HOST}/public` + `icon`, masalan `https://api.example.com/public/payment-type/payme.png`.

**Xatolar**

| Kod | Sabab |
|---|---|
| 404 | `Talaba topilmadi` — foydalanuvchida student profili yo'q |
| 404 | `Kurs topilmadi` — kurs mavjud emas yoki faol emas |
| 400 | `Siz allaqachon ushbu kursga yozilgansiz` — kursda `active` yozilish bor |

### 2. To'lov turini tanlash

```http
PATCH /api/payments/{paymentId}/payment-type
Content-Type: application/json
```

```json
{ "paymentTypeId": "pt000000-0000-0000-0000-000000000001" }
```

**200 OK** — yangilangan to'lov qaytadi, `paymentType` to'ldirilgan holda:

```json
{
  "id": "pa000000-0000-0000-0000-000000000001",
  "status": "created",
  "paymentType": {
    "id": "pt000000-0000-0000-0000-000000000001",
    "icon": "/payment-type/payme.png",
    "title": "Payme",
    "url": "https://payme.uz/checkout",
    "isActive": true
  },
  "enrollment": { "id": "en000000-0000-0000-0000-000000000001", "status": "created" },
  "createdAt": "2026-05-18T10:00:00.000Z",
  "updatedAt": "2026-05-18T10:05:00.000Z"
}
```

Ilova shundan so'ng foydalanuvchini `paymentType.url` ga yo'naltiradi.

**Xatolar**

| Kod | Sabab |
|---|---|
| 404 | `To'lov topilmadi` — to'lov yo'q yoki boshqa foydalanuvchiga tegishli |
| 400 | `Yakunlangan to'lovni o'zgartirib bo'lmaydi` — status `created` emas |
| 404 | `To'lov turi topilmadi` |
| 400 | `To'lov turi faol emas` |

### 3. Mening to'lovlarim

```http
GET /api/payments/me?page=1&limit=10
```

**200 OK**

```json
{
  "data": [
    {
      "id": "pa000000-0000-0000-0000-000000000001",
      "status": "created",
      "paymentType": { "id": "pt000000-0000-0000-0000-000000000001", "title": "Payme" },
      "enrollment": {
        "id": "en000000-0000-0000-0000-000000000001",
        "status": "created",
        "start": null,
        "end": null,
        "course": { "id": "c0000000-0000-0000-0000-000000000001", "title": "English A1" }
      },
      "createdAt": "2026-05-18T10:00:00.000Z",
      "updatedAt": "2026-05-18T10:05:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 4. Bitta to'lov holati

```http
GET /api/payments/{paymentId}
```

Faqat o'z to'lovini qaytaradi, aks holda `404 To'lov topilmadi`. To'lov tasdiqlanganini bilish uchun shu endpoint ishlatiladi:

```json
{
  "id": "pa000000-0000-0000-0000-000000000001",
  "status": "paid",
  "enrollment": {
    "id": "en000000-0000-0000-0000-000000000001",
    "status": "active",
    "start": "2026-05-18T00:00:00.000Z",
    "end": "2026-08-18T00:00:00.000Z",
    "course": { "id": "c0000000-0000-0000-0000-000000000001", "title": "English A1" }
  }
}
```

---

## Bog'liq endpointlar

- `GET /api/courses/available` — foydalanuvchida `created` yoki `active` yozilishi bo'lmagan faol kurslar. To'lov so'rovi yaratilgach kurs bu ro'yxatdan chiqadi.
- `GET /api/courses/me` — **faqat `active` holatidagi** yozilishlar. To'lov tasdiqlanmaguncha (`created`) yoki bekor qilinganda (`cancelled`) kurs bu ro'yxatda ko'rinmaydi. Har bir yozilishda `totalProgress` va `isExpired` maydonlari bor; `isExpired` — `end` sanasi o'tganini bildiradi.
- Kutilayotgan to'lovni kuzatish uchun `GET /api/payments/me` ishlatiladi — `created` yozilishlar faqat shu yerda ko'rinadi.

---

## Admin endpointlari

Rol: `ADMIN`.

### To'lovlar ro'yxati

```http
GET /api/admin/payments?page=1&limit=10&status=created&userId=&paymentTypeId=&enrollmentId=
```

Barcha filtrlar ixtiyoriy. Sahifalangan javob qaytaradi.

### Bitta to'lov

```http
GET /api/admin/payments/{id}
```

### To'lovni tasdiqlash / bekor qilish

```http
PATCH /api/admin/payments/{id}/status
Content-Type: application/json
```

Tasdiqlash — `start` va `end` majburiy:

```json
{
  "status": "paid",
  "start": "2026-05-18T00:00:00.000Z",
  "end": "2026-08-18T00:00:00.000Z"
}
```

Natija:

- payment → `paid`;
- enrollment → `active`, `start` / `end` to'ldiriladi;
- `enrollment_histories` ga yozuv qo'shiladi (`purchaseAmount` — kurs narxi).

Bekor qilish:

```json
{ "status": "cancelled" }
```

Natija: payment → `cancelled`, enrollment → `cancelled`.

**Xatolar**

| Kod | Sabab |
|---|---|
| 400 | `To'lov holati allaqachon yakunlangan` — status `created` emas |
| 400 | `To'lov holati faqat 'paid' yoki 'cancelled' bo'lishi mumkin` |
| 400 | `To'lovni tasdiqlash uchun boshlanish va tugash sanasi kerak` |
| 400 | `Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak` |
| 404 | `To'lov topilmadi` |

### To'lovni o'chirish

```http
DELETE /api/admin/payments/{id}
```

`204 No Content`.

---

## To'lov turlari (faqat admin)

To'lov turlarini boshqarish CRUD'i — ilova foydalanuvchisi uchun emas.

| Method | Route | Izoh |
|---|---|---|
| POST | `/api/admin/payment-types` | `multipart/form-data`: `title`, `url`, `isActive?`, `icon?` (rasm fayli) |
| GET | `/api/admin/payment-types` | barchasi, nofaollari bilan |
| GET | `/api/admin/payment-types/{id}` | bittasi |
| PATCH | `/api/admin/payment-types/{id}` | `multipart/form-data`, barcha maydonlar ixtiyoriy |
| DELETE | `/api/admin/payment-types/{id}` | to'lovlari bor turni o'chirib bo'lmaydi (400) |

Yuklangan `icon` fayllar `uploads/payment-type/` ga tushadi va `/public/payment-type/*` orqali beriladi.
