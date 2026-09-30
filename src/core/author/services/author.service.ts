import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Author } from '@/core/author/entity/author.entity';
import { CreateAuthorDto } from '@/core/author/dto/create-author.dto';
import { UpdateAuthorDto } from '@/core/author/dto/update-author.dto';
import { paginate, Paginated, PaginationQuery } from '@/common/dto/pagination-query.dto';

@Injectable()
export class AuthorService {
  constructor(@InjectRepository(Author) private readonly authorRepo: Repository<Author>) {}

  createAuthor(dto: CreateAuthorDto, avatar?: string): Promise<Author> {
    return this.authorRepo.save({ ...dto, avatar: avatar ?? null });
  }

  async findAllAuthors(query: PaginationQuery): Promise<Paginated<Author>> {
    const [data, total] = await this.authorRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.take,
    });
    return paginate(data, total, query);
  }

  async findOneAuthor(id: string): Promise<Author> {
    const author = await this.authorRepo.findOne({
      where: { id },
      relations: { courses: true },
      select: { courses: { id: true, title: true, image: true, isActive: true } },
    });
    if (!author) throw new NotFoundException('Muallif topilmadi');
    return author;
  }

  async updateAuthor(id: string, dto: UpdateAuthorDto, avatar?: string): Promise<Author> {
    const author = await this.authorRepo.findOne({ where: { id } });
    if (!author) throw new NotFoundException('Muallif topilmadi');
    Object.assign(author, dto);
    if (avatar) author.avatar = avatar;
    await this.authorRepo.save(author);
    return this.findOneAuthor(id);
  }

  async deleteAuthor(id: string): Promise<void> {
    const author = await this.authorRepo.findOne({ where: { id } });
    if (!author) throw new NotFoundException('Muallif topilmadi');
    await this.authorRepo.remove(author);
  }
}
