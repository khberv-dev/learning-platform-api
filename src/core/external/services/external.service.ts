import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Student } from '@/core/user/entity/student.entity';
import { Course } from '@/core/course/entity/course.entity';
import { paginate, Paginated } from '@/common/dto/pagination-query.dto';
import { SearchStudentsQuery } from '@/core/external/dto/search-students.query';
import { ExternalEnrollmentDto } from '@/core/external/dto/external-enrollment.dto';
import { EnrollmentService } from '@/core/enrollment/services/enrollment.service';
import { PendingEnrollmentService } from '@/core/enrollment/services/pending-enrollment.service';
import { CreatePendingEnrollmentDto } from '@/core/enrollment/dto/create-pending-enrollment.dto';

export interface ExternalStudent {
  studentId: string;
  userId: string;
  firstName: string;
  lastName: string | null;
  phoneNumber: string;
  level: string;
}

export interface ExternalPlan {
  id: string;
  title: string;
  price: number;
  month: number;
  hasMentor: boolean;
}

export interface ExternalCourse {
  id: string;
  title: string;
  description: string | null;
  plans: ExternalPlan[];
}

@Injectable()
export class ExternalService {
  constructor(
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    private readonly enrollmentService: EnrollmentService,
    private readonly pendingEnrollmentService: PendingEnrollmentService,
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

  /**
   * Faol kurslar va ularning faol tariflari. Tashqi xizmat yozilish ochish uchun
   * `planId` yoki `courseId` ni shu ro'yxatdan oladi. Kurs mazmuni (unit, lesson)
   * qaytarilmaydi — faqat tanlash uchun kerakli maydonlar.
   *
   * Tarifsiz kurslar ham qaytariladi: ular `courseId` + `end` bilan ochiladi.
   */
  async listCourses(): Promise<ExternalCourse[]> {
    const courses = await this.courseRepo.find({
      where: { isActive: true },
      relations: { plans: true },
      order: { title: 'ASC' },
    });

    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description ?? null,
      plans: course.plans
        .filter((plan) => plan.isActive)
        .sort((a, b) => a.month - b.month)
        .map((plan) => ({
          id: plan.id,
          title: plan.title,
          price: plan.price,
          month: plan.month,
          hasMentor: plan.hasMentor,
        })),
    }));
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

  /**
   * Yozilish so'rovini navbatga qo'yadi — yozilish darhol ochilmaydi, admin
   * tasdiqlashi kerak. Tasdiqlanganda tarif tanlanadi va to'lov yozuvi yaratiladi.
   */
  createPendingEnrollment(dto: CreatePendingEnrollmentDto) {
    return this.pendingEnrollmentService.createPending(dto);
  }

  /** So'rov holatini kuzatish uchun — tashqi xizmat javobni shu yerdan oladi. */
  findPendingEnrollment(id: string) {
    return this.pendingEnrollmentService.findOnePending(id);
  }
}
