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

  async findMe(userId: string) {
    const student = await this.studentRepo.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
    if (!student) throw new NotFoundException('Talaba topilmadi');
    return student;
  }
}
