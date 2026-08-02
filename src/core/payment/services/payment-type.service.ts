import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentType } from '@/core/payment/entity/payment-type.entity';
import { Payment } from '@/core/payment/entity/payment.entity';
import { CreatePaymentTypeDto } from '@/core/payment/dto/create-payment-type.dto';
import { UpdatePaymentTypeDto } from '@/core/payment/dto/update-payment-type.dto';

@Injectable()
export class PaymentTypeService {
  constructor(
    @InjectRepository(PaymentType) private readonly paymentTypeRepo: Repository<PaymentType>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
  ) {}

  createPaymentType(dto: CreatePaymentTypeDto, icon?: string): Promise<PaymentType> {
    return this.paymentTypeRepo.save({ ...dto, icon });
  }

  findAllPaymentTypes(): Promise<PaymentType[]> {
    return this.paymentTypeRepo.find({ order: { createdAt: 'ASC' } });
  }

  findActivePaymentTypes(): Promise<PaymentType[]> {
    return this.paymentTypeRepo.find({ where: { isActive: true }, order: { createdAt: 'ASC' } });
  }

  async findOnePaymentType(id: string): Promise<PaymentType> {
    const paymentType = await this.paymentTypeRepo.findOne({ where: { id } });
    if (!paymentType) throw new NotFoundException("To'lov turi topilmadi");
    return paymentType;
  }

  async updatePaymentType(id: string, dto: UpdatePaymentTypeDto, icon?: string): Promise<PaymentType> {
    const paymentType = await this.findOnePaymentType(id);
    Object.assign(paymentType, dto);
    if (icon) paymentType.icon = icon;
    return this.paymentTypeRepo.save(paymentType);
  }

  async deletePaymentType(id: string): Promise<void> {
    const paymentType = await this.findOnePaymentType(id);
    const used = await this.paymentRepo.count({ where: { paymentType: { id } } });
    if (used > 0) {
      throw new BadRequestException("To'lovlari mavjud to'lov turini o'chirib bo'lmaydi");
    }
    await this.paymentTypeRepo.remove(paymentType);
  }
}
