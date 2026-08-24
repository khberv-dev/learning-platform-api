import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type Period = 7 | 14 | 30;

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
      this.ds.query<[{ dau: string; wau: string; mau: string }]>(
        `SELECT
           COUNT(DISTINCT user_id) FILTER (WHERE activity_date = $1::date) AS dau,
           COUNT(DISTINCT user_id) FILTER (WHERE activity_date BETWEEN $1::date - 6 AND $1::date) AS wau,
           COUNT(DISTINCT user_id) FILTER (WHERE activity_date BETWEEN $1::date - 29 AND $1::date) AS mau
         FROM user_activities
         WHERE activity_date BETWEEN $1::date - 29 AND $1::date`,
        [today],
      ),
    ]);

    return {
      users: Number(users.count),
      assignments: Number(assignments.count),
      enrollments: Number(enrollments.count),
      mentors: Number(mentors.count),
      dau: Number(activeUsers.dau),
      wau: Number(activeUsers.wau),
      mau: Number(activeUsers.mau),
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

    const activity = this.ds.query<Array<{ date: string; dau: string; wau: string; mau: string }>>(
      `SELECT day::date::text AS date,
         (SELECT COUNT(DISTINCT user_id) FROM user_activities WHERE activity_date = day::date) AS dau,
         (SELECT COUNT(DISTINCT user_id) FROM user_activities
            WHERE activity_date BETWEEN day::date - 6 AND day::date) AS wau,
         (SELECT COUNT(DISTINCT user_id) FROM user_activities
            WHERE activity_date BETWEEN day::date - 29 AND day::date) AS mau
       FROM GENERATE_SERIES($1::date, $2::date, INTERVAL '1 day') AS day
       ORDER BY day ASC`,
      [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
    );

    const [users, assignments, enrollments, mentors, activeUsers] = await Promise.all([
      query('users'),
      query('assignments'),
      query('enrollments'),
      query('teachers'),
      activity,
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
        dau: number;
        wau: number;
        mau: number;
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
        dau: 0,
        wau: 0,
        mau: 0,
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
    for (const row of activeUsers) {
      const entry = skeleton.get(row.date);
      if (entry) {
        entry.dau = Number(row.dau);
        entry.wau = Number(row.wau);
        entry.mau = Number(row.mau);
      }
    }

    return [...skeleton.values()];
  }
}
