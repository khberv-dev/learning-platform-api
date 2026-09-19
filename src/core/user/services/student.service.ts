import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { paginate, Paginated } from '@/common/dto/pagination-query.dto';
import { STUDENT_SORT_COLUMN, StudentQuery } from '@/core/user/dto/student-query.dto';
import { Enrollment } from '@/core/enrollment/entity/enrollment.entity';
import { EnrollmentStatus } from '@/core/enrollment/enum/enrollment-status.enum';
import { hashPassword } from '@/shared/utils/hash.util';

type StudentWithActiveCoursesCount = Student & { activeCoursesCount: number };

@Injectable()
export class StudentService {
  constructor(@InjectRepository(Student) private readonly studentRepo: Repository<Student>) {}

  async findAll(query: StudentQuery): Promise<Paginated<StudentWithActiveCoursesCount>> {
    const qb = this.studentRepo.createQueryBuilder('student');

    const activeCoursesCount = qb
      .subQuery()
      .select('COUNT(activeEnrollment.id)')
      .from(Enrollment, 'activeEnrollment')
      .innerJoin('activeEnrollment.student', 'activeStudent')
      .where('activeStudent.id = student.id')
      .andWhere('activeEnrollment.status = :activeStatus')
      .andWhere('(activeEnrollment.end IS NULL OR activeEnrollment.end >= :now)')
      .getQuery();

    qb.addSelect(`(${activeCoursesCount})`, 'activeCoursesCount').setParameters({
      activeStatus: EnrollmentStatus.ACTIVE,
      now: new Date(),
    });

    if (query.level) {
      qb.andWhere('student.level = :level', { level: query.level });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('student.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.hasCourse !== undefined) {
      qb.andWhere(`(${activeCoursesCount}) ${query.hasCourse ? '>' : '='} 0`);
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('student.firstName ILIKE :search', { search })
            .orWhere('student.lastName ILIKE :search', { search })
            .orWhere('student.phoneNumber ILIKE :search', { search })
            .orWhere('student.email ILIKE :search', { search });
        }),
      );
    }

    const total = await qb.getCount();
    const { entities, raw } = await qb
      .orderBy(STUDENT_SORT_COLUMN[query.sortBy], query.sortOrder)
      .skip(query.skip)
      .take(query.take)
      .getRawAndEntities<{ activeCoursesCount: string }>();

    const data = entities.map((student, index) =>
      Object.assign(student, { activeCoursesCount: Number(raw[index].activeCoursesCount) }),
    );

    return paginate(data, total, query);
  }

  async findOne(id: string) {
    const student = await this.studentRepo
      .createQueryBuilder('student')
      .leftJoin('student.enrollments', 'enrollment')
      .leftJoin('enrollment.course', 'course')
      .select([
        'student.id',
        'student.points',
        'student.coins',
        'student.level',
        'student.createdAt',
        'student.firstName',
        'student.lastName',
        'student.avatar',
        'student.email',
        'student.phoneNumber',
        'student.isActive',
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

  async findMe(id: string) {
    const student = await this.studentRepo.findOne({ where: { id } });
    if (!student) throw new NotFoundException('Talaba topilmadi');
    return student;
  }

  async setPassword(id: string, password: string): Promise<void> {
    const exists = await this.studentRepo.existsBy({ id });
    if (!exists) throw new NotFoundException('Talaba topilmadi');
    await this.studentRepo.update(id, { password: await hashPassword(password) });
  }
}
