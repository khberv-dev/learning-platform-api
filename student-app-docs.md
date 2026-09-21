# Student mobile app API

Everything the student mobile app needs: authentication, and every `/api/v2/student/*`
route. Nothing here is reachable by a mentor or admin token, and nothing mentor/admin-only is
documented here.

- **Base URL:** `{HOST}/api/v2` — the version number is a hardcoded `API_VERSION` constant at the
  top of `src/main.ts`, bumped on breaking API changes. All paths below are written relative to
  this base, e.g. `student/me` means `{HOST}/api/v2/student/me`.
- **Auth header:** `Authorization: Bearer <accessToken>` on every route except `auth/*`.
- **Content type:** `application/json` unless the route uploads a file, which uses
  `multipart/form-data` (called out per-route below).
- **Uploaded files** (avatars, chat files, recordings, assessment audio, …) come back as full,
  ready-to-use URLs already, e.g. `"avatar": "{HOST}/public/avatar/xxxx.png"` — the server stores
  just the relative path and expands it to `{FILES_BASE_URL}/public/<path>` (`{HOST}` above) on
  every response, so there's nothing for the client to resolve.
- **Pagination:** any endpoint returning a page takes `?page=1&limit=10` (`page` ≥ 1, `limit` 1–100,
  defaults `1`/`10`) and returns:
  ```json
  { "data": [ /* items */ ], "total": 137, "page": 1, "limit": 10, "totalPages": 14 }
  ```
- **Errors:** standard Nest shape, `{ "statusCode": 400, "message": "...", "error": "Bad Request" }`
  (`message` is an array of strings for request-validation failures, a single string for a specific
  business rule from the service, e.g. `"Talaba topilmadi"`). Error text is Uzbek.
- **Every `student/*` route requires a `role: "student"` access token** — a mentor or admin token
  gets `403 Forbidden`.

## Table of contents

1. [Authentication](#1-authentication)
2. [Self / profile](#2-self--profile)
3. [Courses](#3-courses)
4. [Plans](#4-plans)
5. [Materials](#5-materials)
6. [Task submissions](#6-task-submissions)
7. [Mentors](#7-mentors)
8. [Groups](#8-groups)
9. [Live lessons](#9-live-lessons)
10. [Live lesson recordings](#10-live-lesson-recordings)
11. [Payments](#11-payments)
12. [Enrollments](#12-enrollments)
13. [Assessment (AI speaking partner)](#13-assessment-ai-speaking-partner)
14. [Chat](#14-chat)
15. [Notifications](#15-notifications)
16. [Sessions (push/device tokens)](#16-sessions-pushdevice-tokens)
17. [WebSockets](#17-websockets)

---

## 1. Authentication

Not role-prefixed — there's no role yet at this point. Base path: `auth/`.

### Sign up

```http
POST auth/sign-up
```

```json
{
  "firstName": "Sevara",
  "lastName": "Karimova",
  "phoneNumber": "998901234567",
  "password": "secret123",
  "code": "123456",
  "level": "A1"
}
```

- `lastName` optional.
- Exactly one of `phoneNumber` / `email` (send `email` instead of `phoneNumber` to register by email).
- `code` — the 6-digit OTP from `POST auth/otp/send` (`purpose: "registration"`), required.
- `level` — optional, one of `A1` `A2` `B1` `B2` `C1` `C2`; defaults to `A1` if omitted.

**201 Created**

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "role": "student"
}
```

**Errors:** `400 Bu telefon raqam allaqachon ro'yxatdan o'tgan` (phone/email already has a student
account) · `400 OTP noto'g'ri yoki muddati o'tgan` (bad/expired/already-used code).

### Sign in

Sign-in is role-scoped, not shared — the student app always calls the student route (there's no
`role` field to send; the route itself picks the table).

```http
POST auth/student/sign-in
```

```json
{ "phoneNumber": "998901234567", "password": "secret123" }
```

Exactly one of `phoneNumber` / `email`, plus `password`.

**200 OK** — same shape as sign-up: `{ "accessToken", "refreshToken", "role": "student" }`.

**Errors:** `400 Login yoki parol noto'g'ri` · `401 Hisobingiz faol emas` (account deactivated).

### Refresh

```http
POST auth/refresh
Authorization: Bearer <refreshToken>
```

No body. **200 OK**: `{ "accessToken": "...", "refreshToken": "..." }` (no `role` key here).

### Send OTP

```http
POST auth/otp/send
```

```json
{ "phoneNumber": "998901234567", "purpose": "registration" }
```

- `purpose` optional, `"registration"` (default) or `"recover"`. Use `"recover"` before
  `recover-password` — `"registration"` rejects a phone/email that already has a student account,
  `"recover"` does not.
- One of `phoneNumber` / `email`.

**200/201 OK:** `{ "message": "OTP yuborildi" }`.

**Errors:** `429` (cooldown / hourly cap — see message for which), `400 Bu telefon raqam
allaqachon ro'yxatdan o'tgan` (registration purpose, already taken).

### Recover password

```http
POST auth/recover-password
```

```json
{
  "phoneNumber": "998901234567",
  "code": "123456",
  "newPassword": "newSecret456"
}
```

`code` is the OTP sent with `purpose: "recover"`. **200/201 OK:** `{ "message": "Parol yangilandi" }`.

**Errors:** `400 OTP noto'g'ri yoki muddati o'tgan` · `404 Foydalanuvchi topilmadi`.

---

## 2. Self / profile

Base path: `student/`. All require a student token.

### Get my profile

```http
GET student/me
```

Also records today's activity (streak) as a side effect.

**200 OK**

```json
{
  "id": "f2c8a0e0-1111-2222-3333-444455556666",
  "firstName": "Sevara",
  "lastName": "Karimova",
  "avatar": "{HOST}/public/avatar/9f1c2a3b-1111-2222-3333-444455556666.png",
  "email": null,
  "phoneNumber": "998901234567",
  "isActive": true,
  "points": 120,
  "coins": 45,
  "level": "A1",
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-05-18T10:00:00.000Z"
}
```

### Record activity

```http
POST student/me/activity
```

No body. Explicit version of the side effect `GET student/me` already does — call it if the app
doesn't hit `GET student/me` on open but still wants the streak to tick.

**200 OK:** `{ "activityDate": "2026-05-18", "hasCourse": true, "recorded": true }` — `recorded` is
`false` if today was already recorded (still 200, not an error).

### Streak

```http
GET student/me/streak
```

**200 OK**

```json
{
  "currentStreak": 5,
  "longestStreak": 12,
  "totalActiveDays": 40,
  "activeToday": true,
  "lastActiveDate": "2026-05-18"
}
```

### Upload avatar

```http
PATCH student/me/avatar
Content-Type: multipart/form-data
```

Field name: `avatar` (image file). **200 OK:** the updated profile, same shape as `GET student/me`
minus `points`/`coins`/`level` — just `{ id, role, firstName, lastName, avatar, email,
phoneNumber, isActive }`.

**Errors:** `400 Rasm yuborilmagan` (no file) · `400 Faqat rasm fayllari qabul qilinadi` (non-image).

---

## 3. Courses

Base path: `student/courses`.

### Active courses

```http
GET student/courses
```

**200 OK** — array of courses (not paginated):

```json
[
  {
    "id": "c0000000-0000-0000-0000-000000000001",
    "title": "English A1",
    "description": "Beginner course",
    "image": "{HOST}/public/course/abcd0000-1111-2222-3333-444455556666.jpg",
    "isActive": true,
    "index": 0,
    "units": [
      {
        "id": "u0000000-0000-0000-0000-000000000001",
        "title": "Unit 1",
        "index": 0,
        "lessons": [
          {
            "id": "l0000000-0000-0000-0000-000000000001",
            "title": "Greetings",
            "description": "...",
            "media": "{HOST}/public/lesson/xyz00000-1111-2222-3333-444455556666.mp4",
            "index": 0,
            "isLocked": false
          }
        ],
        "lessonsCount": 1
      }
    ],
    "lessonsCount": 1,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

`isLocked` is currently always `false` for every lesson (sequential unlocking is switched off
server-side) but the field is always present — don't remove UI that reads it.

### One active course

```http
GET student/courses/:id
```

**200 OK** — same shape as one element of the list above. **404** if the course doesn't exist or
isn't active.

### Available (purchasable) courses

```http
GET student/courses/available
```

**200 OK** — same course array shape as `GET student/courses`, filtered to courses the student
doesn't already have a current (`active`, unexpired) enrollment for. A course with a pending
(`created`) or expired enrollment still appears here.

### My courses (enrolled)

```http
GET student/courses/me
```

**200 OK** — array of the student's `active`, unexpired enrollments:

```json
[
  {
    "id": "en000000-0000-0000-0000-000000000001",
    "status": "active",
    "start": "2026-01-15T10:00:00.000Z",
    "end": "2026-04-15T10:00:00.000Z",
    "course": { "id": "c0000000-0000-0000-0000-000000000001", "title": "English A1", "...": "..." },
    "unitsCount": 4,
    "lessonsCount": 20,
    "totalProgress": 45,
    "isExpired": false
  }
]
```

`totalProgress` is 0–100, the share of the course's lessons passed. `isExpired` is always `false`
here (expired enrollments are excluded from this list entirely).

### Lesson tasks (without answers)

```http
GET student/courses/:courseId/units/:unitId/lessons/:lessonId/tasks
```

Requires an active, unexpired enrollment in the course — `403 Siz bu kursga yozilmagansiz yoki
muddati tugagan` otherwise.

**200 OK**

```json
[
  {
    "id": "t0000000-0000-0000-0000-000000000001",
    "name": "Vocabulary",
    "questions": [
      { "question": "Choose a letter", "options": ["A", "B"] },
      { "question": "Write a word", "options": null }
    ],
    "file": null,
    "contentType": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

Note `answer` is never present on `questions` here — see [Task submissions](#6-task-submissions)
for how a task is graded without ever exposing it.

---

## 4. Plans

Base path: `student/courses/:courseId/plans`.

```http
GET student/courses/:courseId/plans
```

**200 OK** — active plans only, cheapest/shortest first:

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

`price` is in so'm. See [Payments](#11-payments) for buying one.

---

## 5. Materials

Base path: `student/lessons/:lessonId/materials`.

```http
GET student/lessons/:lessonId/materials
```

**200 OK**

```json
[
  {
    "id": "m0000000-0000-0000-0000-000000000001",
    "name": "Grammar sheet",
    "url": "{HOST}/public/material/xyz00000-1111-2222-3333-444455556666.pdf",
    "type": "pdf",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

`type` is `pdf`, `doc`, or `image`. `url` is already a full URL.

---

## 6. Task submissions

Base path: `student/task-submissions`.

### Submit answers

```http
POST student/task-submissions
```

Body is `{ "<taskId>": ["answer1", "answer2"] }` — one entry per task, one array of answer strings
per task (order matches the task's `questions` array). Not a DTO class — validated by hand, so
extra/unknown top-level fields are rejected the same as a bad taskId.

```json
{
  "t0000000-0000-0000-0000-000000000001": ["b", "hello"],
  "t0000000-0000-0000-0000-000000000002": ["true"]
}
```

Grading is fuzzy (case/punctuation/spacing-insensitive) and a task passes at 80% of its questions
correct, not 100%. All tasks in one request are graded in a single transaction — if any task id is
unknown, nothing is saved.

**200/201 OK**

```json
[
  {
    "taskId": "t0000000-0000-0000-0000-000000000001",
    "answers": ["b", "hello"],
    "isCorrect": true,
    "rewarded": true
  },
  {
    "taskId": "t0000000-0000-0000-0000-000000000002",
    "answers": ["true"],
    "isCorrect": false,
    "rewarded": false
  }
]
```

`rewarded` is `true` only the *first* time a task is passed (coins/points are granted once).
Resubmitting an already-passed task returns `isCorrect: true, rewarded: false`.

**Errors:** `404 Topshiriq topilmadi: <id>` (unknown task id) · `403 Siz bu kursga yozilmagansiz
yoki muddati tugagan` (no active enrollment for that task's course).

### Lesson results

```http
GET student/task-submissions/lessons/:lessonId
```

**200 OK** — every task in the lesson, with this student's submission if any:

```json
[
  {
    "taskId": "t0000000-0000-0000-0000-000000000001",
    "name": "Vocabulary",
    "questions": [{ "question": "Choose a letter", "options": ["A", "B"] }],
    "file": null,
    "contentType": null,
    "submission": {
      "answers": ["b"],
      "isCorrect": true,
      "submittedAt": "2026-05-18T10:00:00.000Z"
    }
  },
  {
    "taskId": "t0000000-0000-0000-0000-000000000002",
    "name": "Listening",
    "questions": [{ "question": "...", "options": null }],
    "file": "{HOST}/public/task-audio/xyz00000-1111-2222-3333-444455556666.mp3",
    "contentType": "audio",
    "submission": null
  }
]
```

### One task result

```http
GET student/task-submissions/:taskId
```

**200 OK** — same per-task shape, `questions[].answer` included as the correct answer for review
after submitting (still no `answer` field until submitted at least once):

```json
{
  "taskId": "t0000000-0000-0000-0000-000000000001",
  "name": "Vocabulary",
  "file": null,
  "contentType": null,
  "questions": [{ "question": "Choose a letter", "options": ["A", "B"], "answer": "b" }],
  "isCorrect": true,
  "submittedAt": "2026-05-18T10:00:00.000Z"
}
```

**Errors:** `404 Topshiriq javobi topilmadi` (never submitted).

---

## 7. Mentors

Base path: `student/mentors`.

### Browse active mentors

```http
GET student/mentors
```

**200 OK**

```json
[
  {
    "id": "mn000000-0000-0000-0000-000000000001",
    "firstName": "Aziz",
    "lastName": "Yusupov",
    "avatar": "{HOST}/public/avatar/mentor00-1111-2222-3333-444455556666.png",
    "status": "active",
    "profession": "IELTS trainer",
    "introVideo": "{HOST}/public/mentor-intro/xyz00000-1111-2222-3333-444455556666.mp4",
    "summaryRating": 4.8,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

`summaryRating` is the average of that mentor's feedback ratings (0 if none yet), rounded to one
decimal.

### One mentor

```http
GET student/mentors/:id
```

**200 OK** — same shape as one list element. **404** if not found or not active.

### Leave feedback

```http
POST student/mentors/:id/feedbacks
```

```json
{ "text": "Great mentor, very patient", "rate": 5 }
```

`rate` integer 0–5. **200/201 OK**

```json
{
  "id": "fb000000-0000-0000-0000-000000000001",
  "text": "Great mentor, very patient",
  "rate": 5,
  "createdAt": "2026-05-18T10:00:00.000Z",
  "updatedAt": "2026-05-18T10:00:00.000Z"
}
```

---

## 8. Groups

Base path: `student/groups`. A group is a named cohort with a mentor team and a student roster —
the only way a student is paired with a mentor; there is no way to browse or pick a mentor
directly. A student is in at most one group at a time; membership is fully admin-managed — this is
the only student-facing route.

### My group

```http
GET student/groups/me
```

**200 OK** — `null` if the student isn't currently in any group:

```json
{
  "id": "gr000000-0000-0000-0000-000000000001",
  "title": "IELTS Intensive — Evening",
  "schedule": { "Mon": ["18:00-19:30"], "Wed": ["18:00-19:30", "20:00 - special session"] },
  "isActive": true,
  "mentors": [
    {
      "id": "gm000000-0000-0000-0000-000000000001",
      "role": "primary",
      "mentor": {
        "id": "mn000000-0000-0000-0000-000000000001",
        "firstName": "Aziz",
        "lastName": "Yusupov",
        "avatar": "{HOST}/public/avatar/mentor00-1111-2222-3333-444455556666.png",
        "status": "active",
        "profession": "IELTS trainer"
      },
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "students": [
    {
      "id": "st000000-0000-0000-0000-000000000001",
      "firstName": "Malika",
      "lastName": "Karimova",
      "avatar": "{HOST}/public/avatar/student0-1111-2222-3333-444455556666.png",
      "level": "B1"
    }
  ],
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

`schedule` is keyed by weekday (`Mon`..`Sun`) but the time values are free text set by the admin —
not restricted to a fixed `HH:MM` format or slot length.
`mentors` has exactly one `"primary"` entry and any number of `"support"` entries.

Every group has exactly one [chat room](#14-chat), created the moment the group is — a student in
the group can read and send in it for as long as they're a member; leaving or being swapped out
removes that access immediately.

---

## 9. Live lessons

Base path: `student/live-lessons`. Read-only for students — the group's mentor schedules these.
There is no more 1:1 pairing — a student's only mentor relationship is through their current
[group](#8-groups), and every live lesson belongs to a group.

```http
GET student/live-lessons?page=1&limit=10
```

**200 OK** — paginated, live lessons for the student's current group (empty page if ungrouped):

```json
{
  "data": [
    {
      "id": "ll000000-0000-0000-0000-000000000001",
      "name": "Speaking practice",
      "meetLink": "https://meet.google.com/xyz-abcd-efg",
      "startTime": "2026-05-20T09:00:00.000Z",
      "endTime": "2026-05-20T09:30:00.000Z",
      "mentor": { "id": "mn000000-0000-0000-0000-000000000001", "firstName": "Aziz", "...": "..." },
      "group": { "id": "gr000000-0000-0000-0000-000000000001", "...": "..." },
      "createdAt": "2026-05-18T10:00:00.000Z",
      "updatedAt": "2026-05-18T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

`mentor` is whoever scheduled the lesson (the group's primary mentor at the time) — it doesn't
change retroactively if the group's primary mentor is later reassigned.

---

## 10. Live lesson recordings

Base path: `student/live-lesson-recordings`.

### My recordings

```http
GET student/live-lesson-recordings/my
```

**200 OK** — array (not paginated), recordings for the student's current group (empty if
ungrouped):

```json
[
  {
    "id": "rc000000-0000-0000-0000-000000000001",
    "title": "Speaking practice recording",
    "videoUrl": "{HOST}/public/live-lesson-recording/xyz00000-1111-2222-3333-444455556666.mp4",
    "group": { "id": "gr000000-0000-0000-0000-000000000001", "...": "..." },
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z"
  }
]
```

### Recordings for one group

```http
GET student/live-lesson-recordings/groups/:groupId
```

**200 OK** — same array shape, filtered to that group. **403** if it isn't the student's current
group.

### One recording

```http
GET student/live-lesson-recordings/:id
```

**200 OK** — single object, same shape. **403** if it doesn't belong to the student's current
group.

---

## 11. Payments

Base path: `student/payments`. See the payment/enrollment lifecycle notes in `CLAUDE.md` for the
full picture (Click/Payme webhooks aren't student-facing and aren't documented here).

### Request a payment

```http
POST student/payments/request
```

```json
{ "planId": "pl000000-0000-0000-0000-000000000001" }
```

Idempotent per course: a second call while a payment is still `created` updates that same pending
payment's plan/amount instead of creating a new one.

**200/201 OK**

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
    "student": { "id": "f2c8a0e0-1111-2222-3333-444455556666", "firstName": "Sevara", "lastName": "Karimova" },
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
      "icon": "{HOST}/public/payment-type/click000-1111-2222-3333-444455556666.png",
      "title": "Click",
      "url": "https://my.click.uz/services/pay?merchant_id=...&merchant_user_id=f2c8a0e0-...&amount=250000",
      "isActive": true
    }
  ]
}
```

`paymentTypes[].url` is fully resolved (placeholders filled in) and ready to open in a browser/webview.

**Errors:** `400 Siz allaqachon ushbu kursga yozilgansiz` (already have a current active enrollment)
· `404 Tarif topilmadi` · `404 Kurs topilmadi`.

### Select a payment type

```http
PATCH student/payments/:id/payment-type
```

```json
{ "paymentTypeId": "pt000000-0000-0000-0000-000000000001" }
```

**200 OK** — the payment, same shape as above with `paymentType` filled in.

**Errors:** `404 To'lov topilmadi` (not found, or belongs to another student) · `400 Yakunlangan
to'lovni o'zgartirib bo'lmaydi` (already `paid`/`cancelled`) · `400 To'lov turi faol emas`.

### My payments

```http
GET student/payments/me?page=1&limit=10
```

**200 OK** — paginated list of the same payment shape.

### One payment

```http
GET student/payments/:id
```

**200 OK** — single payment. Poll this after redirecting to `paymentType.url` to see `status`
flip from `created` to `paid`. **404** if not found or belongs to another student.

---

## 12. Enrollments

Base path: `student/enrollments`.

```http
GET student/enrollments/history
```

**200 OK** — every purchase term this student has ever had, newest first (survives re-purchasing
an expired course — see `CLAUDE.md`):

```json
[
  {
    "id": "eh000000-0000-0000-0000-000000000001",
    "purchaseAmount": "250000.00",
    "start": "2026-01-15T10:00:00.000Z",
    "end": "2026-04-15T10:00:00.000Z",
    "enrollment": {
      "id": "en000000-0000-0000-0000-000000000001",
      "course": { "id": "c0000000-0000-0000-0000-000000000001", "title": "English A1" }
    },
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
]
```

`purchaseAmount` is a decimal-as-string (Postgres `numeric`).

---

## 13. Assessment (AI speaking partner)

Base path: `student/assessments`.

### AssemblyAI key

```http
GET student/assessments/assembly-ai-key
```

**200 OK:** `{ "apiKey": "..." }` — hand this to the on-device AssemblyAI streaming SDK for live
transcription. Not logged (redacted from request/response logging on the server).

### Start a conversation

```http
POST student/assessments/conversations
```

No body. **200/201 OK**

```json
{
  "id": "cv000000-0000-0000-0000-000000000001",
  "createdAt": "2026-05-18T10:00:00.000Z",
  "updatedAt": "2026-05-18T10:00:00.000Z"
}
```

### List conversations

```http
GET student/assessments/conversations?page=1&limit=10
```

**200 OK** — paginated, newest-active-first, each item shaped like the create response above (no
`messages` array in the list — fetch one conversation for its messages).

### One conversation

```http
GET student/assessments/conversations/:id
```

**200 OK**

```json
{
  "id": "cv000000-0000-0000-0000-000000000001",
  "createdAt": "2026-05-18T10:00:00.000Z",
  "updatedAt": "2026-05-18T10:05:00.000Z",
  "messages": [
    {
      "id": "cm000000-0000-0000-0000-000000000001",
      "role": "user",
      "text": "Hi, how are you?",
      "audioPath": "{HOST}/public/assessment-input/xyz00000-1111-2222-3333-444455556666.wav",
      "createdAt": "2026-05-18T10:01:00.000Z"
    },
    {
      "id": "cm000000-0000-0000-0000-000000000002",
      "role": "assistant",
      "text": "I'm doing great, thanks for asking! How about you?",
      "audioPath": "{HOST}/public/assessment-output/xyz00000-1111-2222-3333-444455556666.wav",
      "createdAt": "2026-05-18T10:01:05.000Z"
    }
  ]
}
```

`messages` is ordered oldest → newest.

### Send a turn (speak, get a reply)

```http
POST student/assessments/conversations/:id/messages
Content-Type: multipart/form-data
```

Field name: `audio` (audio file, the student's recorded clip). **200/201 OK**

```json
{
  "userMessage": {
    "id": "cm000000-0000-0000-0000-000000000003",
    "role": "user",
    "text": "What's the weather like today?",
    "audioPath": "{HOST}/public/assessment-input/abc00000-1111-2222-3333-444455556666.wav",
    "createdAt": "2026-05-18T10:02:00.000Z"
  },
  "assistantMessage": {
    "id": "cm000000-0000-0000-0000-000000000004",
    "role": "assistant",
    "text": "I don't have a window to look out of, but I hope it's nice where you are!",
    "audioPath": "{HOST}/public/assessment-output/def00000-1111-2222-3333-444455556666.wav",
    "createdAt": "2026-05-18T10:02:03.000Z"
  }
}
```

`userMessage.text` is the transcript of the uploaded audio; `assistantMessage.audioPath` is
synthesized speech (WAV) of the reply text — play that back to the student.

**Errors:** `400 Audio fayl yuborilmagan` (no file) · `404 Suhbat topilmadi` (bad/foreign
conversation id).

---

## 14. Chat

Base path: `student/chat`. There is **only group chat** — every room is a
[group](#8-groups)'s chat room, created automatically the moment an admin creates the group. There
is no 1:1 mentor chat and no way to create a room directly; a student's access to a room exists
only while they're currently a member of that group.

### List my rooms

```http
GET student/chat/rooms?page=1&limit=10
```

**200 OK** — paginated `ChatRoom` rows (`group` relation attached), newest-activity-first. A
student is in at most one group, so this is at most a single-item page — prefer
`GET student/chat/rooms/:id` for the flattened shape below when displaying one room.

### One room

```http
GET student/chat/rooms/:id
```

**200 OK**

```json
{
  "id": "cr000000-0000-0000-0000-000000000001",
  "group": { "id": "gr000000-0000-0000-0000-000000000001", "title": "IELTS Intensive — Evening" },
  "mentor": { "id": "mn000000-...", "firstName": "Aziz", "lastName": "Yusupov", "avatar": "{HOST}/public/avatar/m0000000-1111-2222-3333-444455556666.png" },
  "students": [
    { "id": "f2c8a0e0-...", "firstName": "Sevara", "lastName": "Karimova", "avatar": null }
  ],
  "createdAt": "2026-05-18T10:00:00.000Z",
  "updatedAt": "2026-05-18T10:05:00.000Z"
}
```

`mentor` is the group's primary mentor (`null` if none assigned yet) — a support mentor never
appears here and has no access to the room. `students` is the group's current roster.

**Errors:** `403 Siz bu chatda emassiz` (not currently in that group).

### Messages

```http
GET student/chat/rooms/:id/messages?page=1&limit=20
```

**200 OK** — paginated, newest-first:

```json
{
  "data": [
    {
      "id": "cm000000-0000-0000-0000-000000000001",
      "type": "text",
      "text": "Hi!",
      "filePath": null,
      "fileName": null,
      "fileSize": null,
      "fileMimeType": null,
      "student": { "id": "f2c8a0e0-...", "firstName": "Sevara", "lastName": "Karimova", "avatar": null },
      "mentor": null,
      "admin": null,
      "createdAt": "2026-05-18T10:05:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

Exactly one of `student` / `mentor` / `admin` is non-null — that's who sent it. An admin can post
into any group's chat; a support mentor never appears as a sender since they have no access.

### Send a text message

```http
POST student/chat/rooms/:id/messages
```

```json
{ "text": "See you at 6pm!" }
```

**200/201 OK** — the created message, same shape as one item above (`type: "text"`). Also
broadcasts over the `/chat` WebSocket namespace (see [WebSockets](#17-websockets)) — no need to
poll after sending if the socket is connected.

### Send a file

```http
POST student/chat/rooms/:id/messages/file
Content-Type: multipart/form-data
```

Field name: `file`. **200/201 OK** — same message shape with `type: "file"` and `filePath`/
`fileName`/`fileSize`/`fileMimeType` filled in. `filePath` is already a full URL, same as every
other uploaded-file field.

**Errors:** `400 Fayl yuborilmagan`.

---

## 15. Notifications

Base path: `student/notifications`. Push history — a `user_notifications` row exists per manual
admin push (when sent as "permanent") and per course-enrollment event; not every push necessarily
appears here (see `CLAUDE.md`'s push notifications section).

```http
GET student/notifications?page=1&limit=20
GET student/notifications/unread?page=1&limit=20
```

**200 OK** — paginated:

```json
{
  "data": [
    {
      "id": "un000000-0000-0000-0000-000000000001",
      "title": "Kursga yozildingiz",
      "body": "«English A1» kursiga muvaffaqiyatli yozildingiz. Darslarni boshlashingiz mumkin.",
      "data": { "event": "course_enrolled", "courseId": "c0000000-0000-0000-0000-000000000001" },
      "isRead": false,
      "createdAt": "2026-05-18T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

`data.event` is one of `course_enrolled`, `mentor_assigned`, `course_created`, `lesson_added`,
`admin_message` — use it for deep-linking; the rest of `data` varies by event (see `CLAUDE.md`).

### Mark as read

```http
PATCH student/notifications/:id/read
```

No body. **200 OK** — the notification, `isRead: true`. Marking an already-read one again is a
no-op, still 200. **404** if the id doesn't belong to this student.

---

## 16. Sessions (push/device tokens)

Base path: `student/sessions`. Register a device on login/app-open so it can receive FCM pushes;
delete it on logout.

### Register a device

```http
POST student/sessions
```

```json
{ "os": "android", "fcmToken": "d8f3a1e0..." }
```

`os` is `"android"` or `"ios"`. Upsert on `fcmToken` — re-registering the same token (e.g. a
different account signing into the same device) just repoints it to the current student.

**200/201 OK**

```json
{
  "id": "se000000-0000-0000-0000-000000000001",
  "os": "android",
  "fcmToken": "d8f3a1e0...",
  "createdAt": "2026-05-18T10:00:00.000Z",
  "updatedAt": "2026-05-18T10:00:00.000Z"
}
```

### One session

```http
GET student/sessions/:id
```

**200 OK** — same shape. **404** if it doesn't exist or belongs to a different student.

### Delete (logout)

```http
DELETE student/sessions/:id
```

**204 No Content**. Call this on sign-out so the device stops receiving pushes for this account.

---

## 17. WebSockets

Two Socket.io namespaces, both authenticated the same way as REST but via the handshake instead of
a header — send the access token as `auth: { token }` on connect (or an `Authorization: Bearer`
handshake header, either works):

```js
io('wss://{HOST}/chat', { auth: { token: accessToken } });
io('wss://{HOST}/match', { auth: { token: accessToken } });
```

These are **not** under `/api/v2` — they're separate Socket.io namespaces on the same
host.

### `/chat`

Real-time delivery for the REST chat above; sending is still done via
`POST student/chat/rooms/:id/messages(/file)`, not over the socket.

| Event (client → server) | Payload | Effect |
|---|---|---|
| `join` | `{ roomId }` | join the room's socket channel (only if already a member) |
| `leave` | `{ roomId }` | leave the room's socket channel |
| `typing` / `stop-typing` | `{ roomId }` | broadcast typing presence to the room |

| Event (server → client) | Payload |
|---|---|
| `message` | the new `ChatMessage`, broadcast to everyone in the room |
| `typing` / `stop-typing` | `{ userId, roomId }` |
| `joined` / `left` | `{ roomId }` |
| `error` | `{ message }` |

On connect, the socket auto-joins every room the student is already a member of.

### `/match`

In-memory 1:1 practice-partner matchmaking with WebRTC voice/video signaling. No REST equivalent —
this is the only way to start a match.

| Event (client → server) | Payload | Effect |
|---|---|---|
| `search` | — | join the queue, or get paired immediately if someone's waiting |
| `cancel` | — | leave the queue while still waiting |
| `signal` | `{ data }` | relay a WebRTC signaling payload to the current partner |
| `leave` | — | end the current match |

| Event (server → client) | Payload |
|---|---|
| `searching` | — (queued, waiting for a partner) |
| `matched` | `{ sessionId, role: "caller" \| "callee", peer: { id, firstName, lastName, avatar } }` |
| `signal` | `{ data }` — relayed from the partner |
| `partner-left` | `{ reason: "leave" \| "disconnect" }` |
| `replaced` | — this socket was superseded by a newer connection for the same account |
| `left` / `cancelled` | — acknowledgement of the client's own `leave`/`cancel` |
| `error` | `{ message }` |
