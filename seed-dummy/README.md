# Seed data

Populates a local database with a demo account per role plus one full course, for manual
testing and demos. Idempotent — safe to run more than once: a user that already exists (matched
by email/phone) has its password re-synced to `users.json` instead of being duplicated, and a
course that already exists (matched by title) is left alone entirely.

## Run

```bash
npm run db:seed
```

Reads `.env` for DB connection info, same as the app itself.

## What it creates

- **Users** (`users.json`), all sharing the password `12340000`:
  | Role | Login | Name |
  |---|---|---|
  | Admin | `admin@i-teach.uz` | iTeach Admin |
  | Mentor (primary) | `998000000201` | Azam Qahramonov |
  | Mentor (support) | `998000000202` | Malika Tosheva |
  | Student | `998000000301` | Asror Xudoyberdiyev |

- **Course** (`courses.json`): "General English" — 2 units, 5 lessons (2 + 3), each lesson with
  4 tasks of 3 questions each (60 questions total). Each lesson's video comes from
  `lessons/<n>.mp4` and is copied into `uploads/lesson/` the same way a real upload would be.

The `lessons/*.mp4` source videos are not committed (see `.gitignore`) — drop your own `1.mp4`
through `5.mp4` into `seed-dummy/lessons/` before running the script.

## Editing the data

`users.json` and `courses.json` are plain data — edit them directly to add more mentors,
students, units, lessons, or tasks; `seed.ts` doesn't need to change for that. It only needs
changes if the shape of what you're seeding changes (a new required column, a new entity).

This script does not create a Group or an Enrollment — the seeded student has no course access
and the mentors aren't paired with them until you do that by hand (`POST admin/groups`, etc.).
