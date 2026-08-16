# External API

Tashqi xizmatlar (CRM, terminal, billing) uchun API. JWT emas — **`X-Auth`** sarlavhasidagi maxfiy kalit bilan ishlaydi.

- Base URL: `{HOST}/api/external`
- Har bir so'rovda: `X-Auth: iteach_...`

## Kalit

Kalit `.env` faylida saqlanadi:

```bash
# openssl rand -base64 32
EXTERNAL_API_KEY=q7Zt0m1J9c4v...
```

Tashqi xizmat shu qiymatni har bir so'rovda `X-Auth` sarlavhasida yuboradi:

```bash
curl -H "X-Auth: $EXTERNAL_API_KEY" "https://api.iteach.uz/api/external/students?phone=9012"
```

Solishtirish doimiy vaqtda (`timingSafeEqual`) bajariladi.

Kalitni almashtirish: `.env` dagi qiymatni yangilab, ilovani qayta ishga tushirish kerak — shundan so'ng eski kalit ishlamaydi. Kalit barcha xizmatlar uchun umumiy, shuning uchun almashtirilganda hammasiga yangi qiymat berilishi kerak.

**Xatolar**

| Kod | Sabab |
|---|---|
| 401 | `X-Auth sarlavhasi kerak` |
| 401 | `API kalit yaroqsiz` (yoki `EXTERNAL_API_KEY` sozlanmagan) |

---

## 1. Talabalarni telefon raqami bo'yicha qidirish

```http
GET /api/external/students?phone=9012&page=1&limit=10
X-Auth: iteach_...
```

Raqamning **bir qismi** bo'yicha qidiradi (`%9012%`). Kamida **4 ta raqam** kerak — aks holda `400`.

**200 OK**

```json
{
  "data": [
    {
      "studentId": "f2c8a0e0-1111-2222-3333-444455556666",
      "userId": "u0000000-0000-0000-0000-000000000001",
      "firstName": "Sevara",
      "lastName": "Karimova",
      "phoneNumber": "998901234567",
      "level": "A1"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

Javobda faqat shu maydonlar bo'ladi — foydalanuvchi obyekti to'liq qaytarilmaydi.

`studentId` — keyingi endpointda ishlatiladi.

**Xatolar**

| Kod | Sabab |
|---|---|
| 400 | `Qidiruv uchun kamida 4 ta raqam kerak` |
| 400 | `Qidiruv faqat raqamlardan iborat bo'lishi kerak` |

## 2. Kurslar va tariflar ro'yxati

```http
GET /api/external/courses
X-Auth: iteach_...
```

Faqat **faol** kurslar va ularning **faol** tariflari. Kurs mazmuni (unit, lesson) qaytarilmaydi.

**200 OK**

```json
[
  {
    "id": "c0000000-0000-0000-0000-000000000001",
    "title": "English A1",
    "description": "Boshlang'ich daraja",
    "plans": [
      {
        "id": "pl000000-0000-0000-0000-000000000001",
        "title": "Standart",
        "price": 250000,
        "month": 3,
        "hasMentor": false
      }
    ]
  }
]
```

Tarifi yo'q kurslar ham qaytariladi (`plans: []`) — ular keyingi endpointda `courseId` + `end` bilan ochiladi.

## 3. Talabani kursga yozish (to'langan summa bilan)

```http
POST /api/external/enrollments
X-Auth: iteach_...
Content-Type: application/json
```

Tarif bo'yicha (muddat tarifdan olinadi):

```json
{
  "studentId": "f2c8a0e0-1111-2222-3333-444455556666",
  "planId": "pl000000-0000-0000-0000-000000000001",
  "amount": 300000
}
```

Tarifsiz, o'z muddati bilan:

```json
{
  "studentId": "f2c8a0e0-1111-2222-3333-444455556666",
  "courseId": "c0000000-0000-0000-0000-000000000001",
  "amount": 300000,
  "start": "2026-09-01T00:00:00.000Z",
  "end": "2027-03-01T00:00:00.000Z"
}
```

| Maydon | Izoh |
|---|---|
| `studentId` | majburiy |
| `planId` | kurs va muddat shundan olinadi |
| `courseId` | `planId` berilmasa majburiy; u holda `end` ham majburiy |
| `amount` | majburiy — to'langan summa, `enrollment_histories` ga yoziladi |
| `start` | berilmasa — hozirgi vaqt |
| `end` | berilmasa — `start` + tarifdagi `month` |

Yozilish darhol `active` holatida ochiladi. Mavjud (muddati tugagan yoki to'lov kutayotgan) yozilish qayta faollashtiriladi — progress saqlanadi.

**201 Created**

```json
{
  "id": "en000000-0000-0000-0000-000000000001",
  "status": "active",
  "start": "2026-08-07T09:20:00.000Z",
  "end": "2026-11-07T09:20:00.000Z",
  "course": { "id": "c0000000-0000-0000-0000-000000000001", "title": "English A1" }
}
```

**Xatolar**

| Kod | Sabab |
|---|---|
| 400 | `Talaba allaqachon ushbu kursga yozilgan` — muddati tugamagan faol yozilish bor |
| 400 | `planId yoki courseId ko'rsatilishi shart` |
| 400 | `Tugash sanasi (end) kerak yoki tarif (planId) ko'rsating` |
| 404 | `Talaba topilmadi` / `Tarif topilmadi` / `Kurs topilmadi` |

## 4. Yozilish so'rovi (admin tasdig'i bilan)

3-endpoint yozilishni darhol ochadi. Bu yerda esa so'rov navbatga tushadi va **admin** uni tasdiqlaydi yoki rad etadi. Pul hali yig'ilmagan yoki qaysi tarif berilishini admin hal qiladigan holatlar uchun.

```http
POST /api/external/pending-enrollments
X-Auth: iteach_...
Content-Type: application/json
```

```json
{
  "userId": "u0000000-0000-0000-0000-000000000001",
  "courseId": "c0000000-0000-0000-0000-000000000001",
  "start": "2026-09-01T00:00:00.000Z"
}
```

| Maydon | Izoh |
|---|---|
| `userId` | majburiy — 1-endpointdagi `userId` (`studentId` emas) |
| `courseId` | majburiy |
| `start` | ixtiyoriy; berilmasa — tasdiqlangan payt |
| `end` | ixtiyoriy; berilmasa — `start` + admin tanlagan tarifdagi `month` |

Tarif (`planId`) bu yerda **so'ralmaydi** — narx va muddat tasdiqlash paytida ma'lum bo'ladi, shuning uchun tarifni admin tanlaydi.

Takroriy so'rov yangi yozuv yaratmaydi: shu foydalanuvchi va kurs uchun `created` holatidagi so'rov bo'lsa, uning sanalari yangilanib o'zi qaytariladi.

**201 Created**

```json
{
  "id": "pe000000-0000-0000-0000-000000000001",
  "status": "created",
  "start": "2026-09-01T00:00:00.000Z",
  "end": null,
  "user": { "id": "u0000000-0000-0000-0000-000000000001", "firstName": "Sevara" },
  "course": { "id": "c0000000-0000-0000-0000-000000000001", "title": "English A1" },
  "enrollment": null
}
```

**Xatolar**

| Kod | Sabab |
|---|---|
| 400 | `Talaba allaqachon ushbu kursga yozilgan` — muddati tugamagan faol yozilish bor |
| 400 | `Kurs faol emas` |
| 400 | `Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak` |
| 404 | `Talaba topilmadi` / `Kurs topilmadi` |

### So'rov holatini tekshirish

```http
GET /api/external/pending-enrollments/{id}
X-Auth: iteach_...
```

| `status` | Ma'no |
|---|---|
| `created` | admin tasdig'i kutilmoqda |
| `accepted` | tasdiqlangan — `enrollment` to'ldirilgan, yozilish `active` |
| `rejected` | rad etilgan; yozilish ham, to'lov ham yaratilmagan |

### Admin tomoni

| Endpoint | Vazifa |
|---|---|
| `GET /api/admin/pending-enrollments` | navbat: `userId`, `courseId`, `status` filtri bilan |
| `GET /api/admin/pending-enrollments/{id}` | bitta so'rov |
| `PATCH /api/admin/pending-enrollments/{id}/accept` | `{ "planId": "...", "amount": 250000 }` |
| `PATCH /api/admin/pending-enrollments/{id}/reject` | rad etish |

Tasdiqlanganda bitta tranzaksiyada: yozilish `active` bo'ladi, `enrollment_histories` ga yozuv qo'shiladi va **`payments`** ga `paid` holatidagi to'lov yoziladi (`amount` berilmasa — tarif narxi). Tarif so'rovdagi kursga tegishli bo'lishi shart. Faqat `created` holatidagi so'rov tasdiqlanadi yoki rad etiladi.

---

## Eslatmalar

- 3-endpoint (`POST /enrollments`) **`payments`** jadvaliga yozuv qo'shmaydi. `amount` faqat `enrollment_histories` ga tushadi — Click orqali o'tgan to'lovlardan ajratib turish uchun. 4-endpoint esa admin tasdiqlaganda `paid` holatidagi to'lov yozuvini yaratadi.
- Kalit bitta va umumiy: kalit bo'lsa, barcha endpointlar ochiq. Qaysi xizmat chaqirganini ajratib bo'lmaydi.
- HTTPS majburiy: kalit sarlavhada ochiq ko'rinishda uzatiladi.
