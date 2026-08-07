import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { paginate, Paginated } from '@/common/dto/pagination-query.dto';
import { SearchStudentsQuery } from '@/core/external/dto/search-students.query';
import { ExternalEnrollmentDto } from '@/core/external/dto/external-enrollment.dto';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';

export interface ExternalStudent {
  studentId: string;
  userId: string;
  firstName: string;
  lastName: string | null;
  phoneNumber: string;
  level: string;
}

@Injectable()
export class ExternalService {
  constructor(
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  /**
   * Telefon raqamning bir qismi bo'yicha qidiruv. Tashqi xizmatga faqat
   * kerakli maydonlar qaytariladi — butun foydalanuvchi obyekti emas.
   */
  async searchStudentsByPhone(query: SearchStudentsQuery): Promise<Paginated<ExternalStudent>> {
    const [students, total] = await this.studentRepo.findAndCount({
      where: { user: { phoneNumber: ILike(`%${query.phone}%`) } },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });

    const data = students.map((student) => ({
      studentId: student.id,
      userId: student.user.id,
      firstName: student.user.firstName,
      lastName: student.user.lastName ?? null,
      phoneNumber: student.user.phoneNumber,
      level: student.level,
    }));

    return paginate(data, total, query);
  }

  /** Yozilishni to'langan summa bilan ochadi — admin qo'lda yozish bilan bir xil yo'l. */
  createEnrollment(dto: ExternalEnrollmentDto) {
    return this.enrollmentService.createEnrollment({
      studentId: dto.studentId,
      planId: dto.planId,
      courseId: dto.courseId,
      start: dto.start,
      end: dto.end,
      purchaseAmount: dto.amount,
    });
  }
}
