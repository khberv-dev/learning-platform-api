import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThanOrEqual, MoreThan, Not, IsNull, Repository } from 'typeorm';
import { Subscription } from '@/core/payment/entity/subscription.entity';
import { SubscriptionQuery } from '@/core/payment/dto/subscription-query.dto';
import { paginate, Paginated } from '@/common/dto/pagination-query.dto';

export interface StudentSubscriptionItem {
  id: string;
  course: { id: string; title: string; image: string | null } | null;
  start: Date | null;
  end: Date | null;
  isActive: boolean;
}

@Injectable()
export class SubscriptionService {
  constructor(@InjectRepository(Subscription) private readonly subscriptionRepo: Repository<Subscription>) {}

  async findMySubscriptions(studentId: string, query: SubscriptionQuery): Promise<Paginated<StudentSubscriptionItem>> {
    const now = new Date();
    const where: FindOptionsWhere<Subscription> = { student: { id: studentId }, start: Not(IsNull()) };
    if (query.courseId) where.course = { id: query.courseId };
    if (query.isActive !== undefined) where.end = query.isActive ? MoreThan(now) : LessThanOrEqual(now);

    const [rows, total] = await this.subscriptionRepo.findAndCount({
      where,
      relations: { course: true },
      order: { end: 'DESC' },
      skip: query.skip,
      take: query.take,
    });

    const data = rows.map((subscription) => ({
      id: subscription.id,
      course: subscription.course
        ? { id: subscription.course.id, title: subscription.course.title, image: subscription.course.image }
        : null,
      start: subscription.start,
      end: subscription.end,
      isActive: !!subscription.end && subscription.end > now,
    }));

    return paginate(data, total, query);
  }
}
