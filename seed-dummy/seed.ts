import 'dotenv/config';
import { Client } from 'pg';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'fs';
import { extname, resolve } from 'path';

interface UsersSeed {
  password: string;
  admin: { email: string; firstName: string; lastName: string };
  mentors: Array<{
    phoneNumber: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    gender: string;
  }>;
  students: Array<{ phoneNumber: string; firstName: string; lastName: string; level: string; gender: string }>;
}

const usersData = JSON.parse(readFileSync(resolve(__dirname, 'users.json'), 'utf-8')) as UsersSeed;
const coursesData = JSON.parse(readFileSync(resolve(__dirname, 'courses.json'), 'utf-8')) as CourseSeed[];

interface TaskQuestionSeed {
  question: string;
  options: string[] | null;
  answer: string;
}

interface TaskSeed {
  name: string;
  questions: TaskQuestionSeed[];
}

interface LessonSeed {
  title: string;
  description: string;
  index: number;
  video: string;
  tasks: TaskSeed[];
}

interface UnitSeed {
  title: string;
  index: number;
  lessons: LessonSeed[];
}

interface CourseSeed {
  title: string;
  description: string;
  isActive: boolean;
  index: number;
  units: UnitSeed[];
}

const LESSONS_SOURCE_DIR = resolve(process.cwd(), 'seed-dummy/lessons');
const LESSON_MEDIA_DEST_DIR = resolve(process.cwd(), 'uploads/lesson');

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 15);
}

async function seedAdmin(client: Client, password: string): Promise<void> {
  const admin = usersData.admin;
  const hashed = await hashPassword(password);
  const existing = await client.query('SELECT id FROM admins WHERE email = $1', [admin.email]);
  if (existing.rowCount) {
    await client.query('UPDATE admins SET password = $1 WHERE email = $2', [hashed, admin.email]);
    console.log(`~ admin ${admin.email} already exists, password synced`);
    return;
  }

  await client.query(
    `INSERT INTO admins (id, first_name, last_name, email, password, is_active)
     VALUES ($1, $2, $3, $4, $5, true)`,
    [randomUUID(), admin.firstName, admin.lastName, admin.email, hashed],
  );
  console.log(`+ admin created: ${admin.email}`);
}

async function seedMentors(client: Client, password: string): Promise<void> {
  const hashed = await hashPassword(password);

  for (const mentor of usersData.mentors) {
    const isActive = mentor.status === 'working';
    const existing = await client.query('SELECT id FROM mentors WHERE phone_number = $1', [mentor.phoneNumber]);
    if (existing.rowCount) {
      await client.query(
        `UPDATE mentors SET password = $1, first_name = $2, last_name = $3, role = $4, status = $5, is_active = $6, gender = $7
         WHERE phone_number = $8`,
        [
          hashed,
          mentor.firstName,
          mentor.lastName,
          mentor.role,
          mentor.status,
          isActive,
          mentor.gender,
          mentor.phoneNumber,
        ],
      );
      console.log(`~ mentor ${mentor.phoneNumber} already exists, synced to seed data (${mentor.status})`);
      continue;
    }

    await client.query(
      `INSERT INTO mentors (id, first_name, last_name, phone_number, password, is_active, status, role, gender)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        mentor.firstName,
        mentor.lastName,
        mentor.phoneNumber,
        hashed,
        isActive,
        mentor.status,
        mentor.role,
        mentor.gender,
      ],
    );
    console.log(`+ mentor created: ${mentor.phoneNumber} (${mentor.firstName} ${mentor.lastName}, ${mentor.role})`);
  }
}

async function seedStudents(client: Client, password: string): Promise<void> {
  const hashed = await hashPassword(password);

  for (const student of usersData.students) {
    const existing = await client.query('SELECT id FROM students WHERE phone_number = $1', [student.phoneNumber]);
    if (existing.rowCount) {
      await client.query(
        `UPDATE students SET password = $1, first_name = $2, last_name = $3, level = $4, gender = $5
         WHERE phone_number = $6`,
        [hashed, student.firstName, student.lastName, student.level, student.gender, student.phoneNumber],
      );
      console.log(`~ student ${student.phoneNumber} already exists, synced to seed data`);
      continue;
    }

    await client.query(
      `INSERT INTO students (id, first_name, last_name, phone_number, password, is_active, level, gender)
       VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
      [randomUUID(), student.firstName, student.lastName, student.phoneNumber, hashed, student.level, student.gender],
    );
    console.log(`+ student created: ${student.phoneNumber} (${student.firstName} ${student.lastName})`);
  }
}

function copyLessonVideo(filename: string): string {
  const source = resolve(LESSONS_SOURCE_DIR, filename);
  if (!existsSync(source)) {
    throw new Error(`Lesson video not found: ${source}`);
  }

  mkdirSync(LESSON_MEDIA_DEST_DIR, { recursive: true });
  const destFilename = `${randomUUID()}${extname(filename)}`;
  copyFileSync(source, resolve(LESSON_MEDIA_DEST_DIR, destFilename));
  return `lesson/${destFilename}`;
}

async function seedTask(client: Client, lessonId: string, task: TaskSeed): Promise<void> {
  await client.query(
    `INSERT INTO tasks (id, name, questions, lesson_id)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), task.name, JSON.stringify(task.questions), lessonId],
  );
}

async function seedLesson(client: Client, unitId: string, lesson: LessonSeed): Promise<void> {
  const media = copyLessonVideo(lesson.video);
  const lessonId = randomUUID();

  await client.query(
    `INSERT INTO lessons (id, title, description, media, index, unit_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [lessonId, lesson.title, lesson.description, media, lesson.index, unitId],
  );
  console.log(`  + lesson created: ${lesson.title} (media: ${media})`);

  for (const task of lesson.tasks) {
    await seedTask(client, lessonId, task);
  }
  console.log(`    + ${lesson.tasks.length} tasks, ${lesson.tasks.reduce((n, t) => n + t.questions.length, 0)} questions`);
}

async function seedUnit(client: Client, courseId: string, unit: UnitSeed): Promise<void> {
  const unitId = randomUUID();
  await client.query(
    `INSERT INTO units (id, title, index, course_id)
     VALUES ($1, $2, $3, $4)`,
    [unitId, unit.title, unit.index, courseId],
  );
  console.log(`+ unit created: ${unit.title}`);

  for (const lesson of unit.lessons) {
    await seedLesson(client, unitId, lesson);
  }
}

async function seedCourse(client: Client, course: CourseSeed): Promise<void> {
  const existing = await client.query('SELECT id FROM courses WHERE title = $1', [course.title]);
  if (existing.rowCount) {
    console.log(`- course "${course.title}" already exists, skipping`);
    return;
  }

  const courseId = randomUUID();
  await client.query(
    `INSERT INTO courses (id, title, description, is_active, index)
     VALUES ($1, $2, $3, $4, $5)`,
    [courseId, course.title, course.description, course.isActive, course.index],
  );
  console.log(`+ course created: ${course.title}`);

  for (const unit of course.units) {
    await seedUnit(client, courseId, unit);
  }
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  await client.connect();
  console.log(`Connected to ${process.env.DB_DATABASE}@${process.env.DB_HOST}\n`);

  try {
    console.log('--- Users ---');
    await seedAdmin(client, usersData.password);
    await seedMentors(client, usersData.password);
    await seedStudents(client, usersData.password);

    console.log('\n--- Courses ---');
    for (const course of coursesData) {
      await seedCourse(client, course);
    }

    console.log('\nDone. Shared password for all seeded accounts:', usersData.password);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
