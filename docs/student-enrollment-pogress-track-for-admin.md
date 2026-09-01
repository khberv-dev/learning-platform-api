# Admin uchun talabaning kurs progressini kuzati/ssh

Bu API administratorga muayyan yozilish (`enrollment`) bo'yicha talabaning kurs, bo'lim va har bir dars kesimidagi progressini ko'rish imkonini beradi.

## Endpoint

```http
GET /api/admin/enrollments/{enrollmentId}/students/{studentId}/progress
Authorization: Bearer <access-token>
```

Endpoint faqat `admin` rolidagi foydalanuvchilar uchun ochiq.

## Path parametrlari

| Parametr | Tur | Majburiy | Izoh |
|---|---|---|---|
| `enrollmentId` | UUID | Ha | Talabaning kursga yozilish identifikatori |
| `studentId` | UUID | Ha | Talaba profilining identifikatori (`students.id`) |

`studentId` foydalanuvchi identifikatori (`users.id`) emas. API ko'rsatilgan yozilish aynan shu talabaga tegishli ekanini tekshiradi.

## So'rov namunasi

```bash
curl --request GET \
  'https://example.com/api/admin/enrollments/8eb1acaf-c27a-4a04-9a5a-65fd4092a111/students/52ec723a-442e-48f4-8a7a-c5652d17a222/progress' \
  --header 'Authorization: Bearer <access-token>'
```

So'rov body qabul qilmaydi.

## Muvaffaqiyatli javob

Status: `200 OK`

```json
{
  "studentId": "52ec723a-442e-48f4-8a7a-c5652d17a222",
  "enrollmentId": "8eb1acaf-c27a-4a04-9a5a-65fd4092a111",
  "status": "active",
  "start": "2026-09-01T00:00:00.000Z",
  "end": "2027-03-01T00:00:00.000Z",
  "course": {
    "id": "a482c135-dc11-48ee-a301-71a0a94a3333",
    "title": "Ingliz tili",
    "progress": 50,
    "units": [
      {
        "id": "5aafc877-3899-48a6-bbd3-47dd7810a444",
        "title": "Present Simple",
        "index": 1,
        "progress": 50,
        "lessons": [
          {
            "id": "a6cb2e19-c83d-4e6e-84aa-878ef144a555",
            "title": "Introduction",
            "index": 1,
            "progress": 100
          },
          {
            "id": "747671e7-d521-41b8-9485-79766a0ca666",
            "title": "Exercises",
            "index": 2,
            "progress": 0
          }
        ]
      }
    ]
  }
}
```

## Javob maydonlari

| Maydon | Tur | Izoh |
|---|---|---|
| `studentId` | UUID | So'ralgan talaba identifikatori |
| `enrollmentId` | UUID | Yozilish identifikatori |
| `status` | string | Yozilish holati: `created`, `active` yoki `cancelled` |
| `start` | ISO 8601 yoki `null` | Yozilishning boshlanish vaqti |
| `end` | ISO 8601 yoki `null` | Yozilishning tugash vaqti |
| `course.id` | UUID | Kurs identifikatori |
| `course.title` | string | Kurs nomi |
| `course.progress` | integer | Kursning umumiy progressi, `0`–`100` |
| `course.units` | array | Kurs bo'limlari |
| `course.units[].id` | UUID | Bo'lim identifikatori |
| `course.units[].title` | string | Bo'lim nomi |
| `course.units[].index` | integer | Bo'limning kurs ichidagi tartibi |
| `course.units[].progress` | integer | Bo'lim progressi, `0`–`100` |
| `course.units[].lessons` | array | Bo'limdagi barcha darslar |
| `course.units[].lessons[].id` | UUID | Dars identifikatori |
| `course.units[].lessons[].title` | string | Dars nomi |
| `course.units[].lessons[].index` | integer | Darsning bo'lim ichidagi tartibi |
| `course.units[].lessons[].progress` | integer | Dars progressi, `0`–`100` |

## Progressni hisoblash qoidalari

- Progress yozuvi hali yaratilmagan dars ham javobga kiritiladi va uning progressi `0` bo'ladi.
- Bo'lim progressi shu bo'limdagi barcha darslar progressining o'rtacha qiymatidir.
- Kurs progressi kursdagi barcha darslar progressining o'rtacha qiymatidir.
- Kurs progressi bo'limlar progressining oddiy o'rtachasi emas. Shu sababli darslari ko'p bo'lgan bo'lim kurs natijasiga mutanosib ta'sir qiladi.
- Hisoblangan o'rtacha qiymatlar eng yaqin butun songa yaxlitlanadi.
- Darsi yo'q bo'lim va umuman darsi yo'q kurs uchun progress `0` bo'ladi.
- Bo'limlar va darslar avval `index`, teng `index` holatida yaratilgan vaqt bo'yicha o'sish tartibida qaytariladi.

Misol: darslar progressi `100`, `50` va `0` bo'lsa, kurs progressi `(100 + 50 + 0) / 3 = 50` bo'ladi.

## Xatoliklar

### Talaba topilmadi

Status: `404 Not Found`

```json
{
  "message": "Talaba topilmadi",
  "error": "Not Found",
  "statusCode": 404
}
```

### Yozilish topilmadi

Status: `404 Not Found`

```json
{
  "message": "Yozilish topilmadi",
  "error": "Not Found",
  "statusCode": 404
}
```

Bu javob quyidagi holatlarda qaytadi:

- `enrollmentId` mavjud emas;
- yozilish mavjud, ammo boshqa talabaga tegishli;
- `studentId` va `enrollmentId` bir-biriga mos emas.

### Avtorizatsiya xatolari

| Status | Sabab |
|---|---|
| `401 Unauthorized` | Access token berilmagan, yaroqsiz yoki muddati tugagan |
| `403 Forbidden` | Foydalanuvchi tizimga kirgan, ammo `admin` roliga ega emas |

## Muhim eslatmalar

- Endpoint yozilish holatidan qat'i nazar progressni ko'rsatadi. Yozilish `created`, `active` yoki `cancelled` bo'lishi mumkin.
- Muddati tugagan yozilish progressini ham ko'rish mumkin; amaldagi holatni aniqlash uchun `status`, `start` va `end` maydonlaridan foydalaning.
- Endpoint ma'lumotlarni o'zgartirmaydi va yangi progress yozuvlarini yaratmaydi.
