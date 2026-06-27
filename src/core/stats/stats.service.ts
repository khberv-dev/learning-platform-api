import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type Period = 7 | 14 | 30;

@Injectable()
export class StatsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async getSummary() {
    const [[users], [assignments], [enrollments], [mentors]] = await Promise.all([
      this.ds.query<[{ count: string }]>('SELECT COUNT(*) FROM users'),
      this.ds.query<[{ count: string }]>('SELECT COUNT(*) FROM assignments'),
      this.ds.query<[{ count: string }]>('SELECT COUNT(*) FROM enrollments'),
      this.ds.query<[{ count: string }]>('SELECT COUNT(*) FROM teachers'),
    ]);

    return {
      users: Number(users.count),
      assignments: Number(assignments.count),
      enrollments: Number(enrollments.count),
      mentors: Number(mentors.count),
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

    const [users, assignments, enrollments, mentors] = await Promise.all([
      query('users'),
      query('assignments'),
      query('enrollments'),
      query('teachers'),
    ]);

    // Build zero-filled skeleton for all days in the period
    const skeleton = new Map<string, { date: string; users: number; assignments: number; enrollments: number; mentors: number }>();
    for (let i = 0; i < period; i++) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      skeleton.set(key, { date: key, users: 0, assignments: 0, enrollments: 0, mentors: 0 });
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

    return [...skeleton.values()];
  }
}
