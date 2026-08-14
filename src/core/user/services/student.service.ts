import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { paginate, Paginated } from '@/common/dto/pagination-query.dto';
import { STUDENT_SORT_COLUMN, StudentQuery } from '@/core/user/dto/student-query.dto';

@Injectable()
export class StudentService {
  constructor(@InjectRepository(Student) private readonly studentRepo: Repository<Student>) {}

  /**
   * Talabalar ro'yxati: qidiruv, filtr, saralash va sahifalash bilan.
   *
   * `find` o'rniga query builder — qidiruv bir nechta ustun bo'yicha `OR`
   * bilan ketadi va saralash foydalanuvchi (`user`) maydonlariga ham tushadi.
   */
  async findAll(query: StudentQuery): Promise<Paginated<Student>> {
    const qb = this.studentRepo.createQueryBuilder('student').leftJoinAndSelect('student.user', 'user');

    if (query.level) {
      qb.andWhere('student.level = :level', { level: query.level });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('user.firstName ILIKE :search', { search })
            .orWhere('user.lastName ILIKE :search', { search })
            .orWhere('user.phoneNumber ILIKE :search', { search })
            .orWhere('user.email ILIKE :search', { search });
        }),
      );
    }

    const [data, total] = await qb
      .orderBy(STUDENT_SORT_COLUMN[query.sortBy], query.sortOrder)
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount();

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
