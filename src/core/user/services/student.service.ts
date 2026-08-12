import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

@Injectable()
export class StudentService {
  constructor(@InjectRepository(Student) private readonly studentRepo: Repository<Student>) {}

  async findAll(query: PaginationQuery): Promise<Paginated<Student>> {
    const [data, total] = await this.studentRepo.findAndCount({
      relations: { user: true },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  /**
   * Bitta talaba — profil sahifasi uchun. Yozilishlar (va ularning kurslari)
   * faqat shu yerda yuklanadi: `findAll` da ular yo'q, chunki ro'yxatga kerak emas.
   * Maydonlar profil sahifasi o'qiydiganlari bilan cheklangan.
   */
  async findOne(id: string) {
    // `find` o'rniga query builder: yozilishlarni `createdAt` bo'yicha saralash
    // kerak, lekin bu maydon javobga kirmaydi. `find` bunday holatda so'rovni
    // DISTINCT ichiga o'rab, tanlanmagan ustunga ORDER BY qo'yadi va xato beradi.
    const student = await this.studentRepo
      .createQueryBuilder('student')
      .leftJoin('student.user', 'user')
      .leftJoin('student.enrollments', 'enrollment')
      .leftJoin('enrollment.course', 'course')
      .select([
        'student.id',
        'student.points',
        'student.coins',
        'student.balance',
        'student.level',
        'student.createdAt',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.avatar',
        'user.email',
        'user.phoneNumber',
        'user.isActive',
        'enrollment.id',
        'enrollment.status',
        'enrollment.start',
        'enrollment.end',
        'course.id',
        'course.title',
      ])
      .where('student.id = :id', { id })
      .orderBy('enrollment.createdAt', 'DESC')
      .getOne();

    if (!student) throw new NotFoundException('Talaba topilmadi');
    return student;
  }

  async findMe(userId: string) {
    const student = await this.studentRepo.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
    if (!student) throw new NotFoundException('Talaba topilmadi');
    return student;
  }
}
