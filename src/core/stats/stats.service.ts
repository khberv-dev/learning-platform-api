import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type Period = 7 | 14 | 30;

type ActiveUserCounts = { total: string; course: string; courseless: string };

@Injectable()
export class StatsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /**
   * `assignments` va `enrollments` — faqat `active` holatdagilari.
   * Bekor qilingan yoki to'lov kutayotganlari umumiy ko'rsatkichni shishirib
   * yuborardi. `users` va `mentors` — barchasi.
   */
  async getSummary() {
    const today = new Date().toISOString().slice(0, 10);
    const [[users], [assignments], [enrollments], [mentors], [activeUsers]] = await Promise.all([
      this.ds.query<[{ count: string }]>('SELECT COUNT(*) FROM users'),
      this.ds.query<[{ count: string }]>("SELECT COUNT(*) FROM assignments WHERE status = 'active'"),
      this.ds.query<[{ count: string }]>("SELECT COUNT(*) FROM enrollments WHERE status = 'active'"),
      this.ds.query<[{ count: string }]>('SELECT COUNT(*) FROM teachers'),
      // Har bir oyna (kun/hafta/oy) uchun foydalanuvchi o'sha oynadagi birorta kunda kursli bo'lsa — kursli,
      // aks holda kurssiz. Timeseries bilan bir xil qoida: `course + courseless = total`.
      this.ds.query<[Record<`${'dau' | 'wau' | 'mau'}_${keyof ActiveUserCounts}`, string>]>(
        `SELECT
           COUNT(*) FILTER (WHERE d) AS dau_total,
           COUNT(*) FILTER (WHERE d AND dc) AS dau_course,
           COUNT(*) FILTER (WHERE d AND NOT dc) AS dau_courseless,
           COUNT(*) FILTER (WHERE w) AS wau_total,
           COUNT(*) FILTER (WHERE w AND wc) AS wau_course,
           COUNT(*) FILTER (WHERE w AND NOT wc) AS wau_courseless,
           COUNT(*) AS mau_total,
           COUNT(*) FILTER (WHERE mc) AS mau_course,
           COUNT(*) FILTER (WHERE NOT mc) AS mau_courseless
         FROM (
           SELECT user_id,
             BOOL_OR(activity_date = $1::date) AS d,
             BOOL_OR(has_course) FILTER (WHERE activity_date = $1::date) AS dc,
             BOOL_OR(activity_date >= $1::date - 6) AS w,
             BOOL_OR(has_course) FILTER (WHERE activity_date >= $1::date - 6) AS wc,
             BOOL_OR(has_course) AS mc
           FROM user_activities
           WHERE activity_date BETWEEN $1::date - 29 AND $1::date
           GROUP BY user_id
         ) AS u`,
        [today],
      ),
    ]);

    const activeMetrics = (key: keyof ActiveUserCounts) => ({
      dau: Number(activeUsers[`dau_${key}`]),
      wau: Number(activeUsers[`wau_${key}`]),
      mau: Number(activeUsers[`mau_${key}`]),
    });

    return {
      users: Number(users.count),
      assignments: Number(assignments.count),
      enrollments: Number(enrollments.count),
      mentors: Number(mentors.count),
      ...activeMetrics('total'),
      activeCourseUserMetrics: activeMetrics('course'),
      activeCourselessUserMetrics: activeMetrics('courseless'),
    };
  }

  async getTimeseries(period: Period) {
    const to = new Date();
    to.setUTCHours(23, 59, 59, 999);

    const from = new Date();
    from.setUTCDate(from.getUTCDate() - (period - 1));
    from.setUTCHours(0, 0, 0, 0);

    const query = (table: string) =>
      this.ds.query<Array<{ date: Date; count: string }>>(
        `SELECT DATE_TRUNC('day', created_at) AS date, COUNT(*) AS count
         FROM ${table}
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY date
         ORDER BY date ASC`,
        [from, to],
      );

    const today = to.toISOString().slice(0, 10);

    /**
     * Har bir oraliq (`bucket`) uchun faol foydalanuvchilarni uch xil sanaydi: jami, kursli va kurssiz.
     * Foydalanuvchi oraliqdagi birorta kunda kursli bo'lgan bo'lsa — kursli, aks holda kurssiz sanaladi,
     * shuning uchun `course + courseless = total` har doim to'g'ri.
     */
    const activeUsersQuery = <T>(labels: string, series: string, range: string) =>
      this.ds.query<Array<T & ActiveUserCounts>>(
        `SELECT ${labels},
           COUNT(u.user_id) AS total,
           COUNT(u.user_id) FILTER (WHERE u.has_course) AS course,
           COUNT(u.user_id) FILTER (WHERE NOT u.has_course) AS courseless
         FROM ${series} AS bucket
         LEFT JOIN LATERAL (
           SELECT user_id, BOOL_OR(has_course) AS has_course
           FROM user_activities
           WHERE ${range}
           GROUP BY user_id
         ) AS u ON TRUE
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [today],
      );

    const dauQuery = activeUsersQuery<{ date: string }>(
      'bucket::date::text AS date',
      `GENERATE_SERIES(DATE_TRUNC('month', $1::date), $1::date, INTERVAL '1 day')`,
      'activity_date = bucket::date',
    );

    const wauQuery = activeUsersQuery<{ startDate: string; endDate: string }>(
      `bucket::date::text AS "startDate", LEAST(bucket::date + 6, $1::date)::text AS "endDate"`,
      `GENERATE_SERIES(DATE_TRUNC('month', $1::date), $1::date, INTERVAL '7 days')`,
      'activity_date BETWEEN bucket::date AND LEAST(bucket::date + 6, $1::date)',
    );

    const mauQuery = activeUsersQuery<{ month: string }>(
      `TO_CHAR(bucket, 'YYYY-MM') AS month`,
      `GENERATE_SERIES(DATE_TRUNC('month', $1::date) - INTERVAL '5 months', DATE_TRUNC('month', $1::date), INTERVAL '1 month')`,
      `activity_date >= bucket::date AND activity_date < (bucket + INTERVAL '1 month')::date`,
    );

    const [users, assignments, enrollments, mentors, dau, wau, mau] = await Promise.all([
      query('users'),
      query('assignments'),
      query('enrollments'),
      query('teachers'),
      dauQuery,
      wauQuery,
      mauQuery,
    ]);

    // Build zero-filled skeleton for all days in the period
    const skeleton = new Map<
      string,
      {
        date: string;
        users: number;
        assignments: number;
        enrollments: number;
        mentors: number;
      }
    >();
    for (let i = 0; i < period; i++) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      skeleton.set(key, {
        date: key,
        users: 0,
        assignments: 0,
        enrollments: 0,
        mentors: 0,
      });
    }

    const toKey = (date: Date | string) => {
      const d = date instanceof Date ? date : new Date(date);
      return d.toISOString().slice(0, 10);
    };

    for (const row of users) {
      const entry = skeleton.get(toKey(row.date));
      if (entry) entry.users = Number(row.count);
    }
    for (const row of assignments) {
      const entry = skeleton.get(toKey(row.date));
      if (entry) entry.assignments = Number(row.count);
    }
    for (const row of enrollments) {
      const entry = skeleton.get(toKey(row.date));
      if (entry) entry.enrollments = Number(row.count);
    }
    for (const row of mentors) {
      const entry = skeleton.get(toKey(row.date));
      if (entry) entry.mentors = Number(row.count);
    }
    const activeMetrics = (key: keyof ActiveUserCounts) => ({
      dau: dau.map((row) => ({ date: row.date, count: Number(row[key]) })),
      wau: wau.map((row) => ({
        startDate: row.startDate,
        endDate: row.endDate,
        count: Number(row[key]),
      })),
      mau: mau.map((row) => ({ month: row.month, count: Number(row[key]) })),
    });

    return {
      businessMetrics: [...skeleton.values()],
      activeUserMetrics: activeMetrics('total'),
      activeCourseUserMetrics: activeMetrics('course'),
      activeCourselessUserMetrics: activeMetrics('courseless'),
    };
  }
}
