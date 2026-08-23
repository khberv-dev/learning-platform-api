import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PaymentTypeService } from '@/core/payment/services/payment-type.service';
import { CreatePaymentTypeDto } from '@/core/payment/dto/create-payment-type.dto';
import { UpdatePaymentTypeDto } from '@/core/payment/dto/update-payment-type.dto';
import { iconFileFilter, paymentTypeIconStorage, toIconPath } from '@/core/payment/storage/payment-type-icon.storage';

const iconUpload = () =>
  UseInterceptors(FileInterceptor('icon', { storage: paymentTypeIconStorage, fileFilter: iconFileFilter }));

@Roles(UserRole.ADMIN)
@Controller('admin/payment-types')
export class AdminPaymentTypeController {
  constructor(private readonly paymentTypeService: PaymentTypeService) {}

  @Post()
  @iconUpload()
  createPaymentType(@Body() dto: CreatePaymentTypeDto, @UploadedFile() file?: Express.Multer.File) {
    return this.paymentTypeService.createPaymentType(dto, file && toIconPath(file.filename));
  }

  @Get()
  findAllPaymentTypes() {
    return this.paymentTypeService.findAllPaymentTypes();
  }

  @Get(':id')
  findOnePaymentType(@Param('id') id: string) {
    return this.paymentTypeService.findOnePaymentType(id);
  }

  @Patch(':id')
  @iconUpload()
  updatePaymentType(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentTypeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.paymentTypeService.updatePaymentType(id, dto, file && toIconPath(file.filename));
  }

  @Delete(':id')
  @HttpCode(204)
  deletePaymentType(@Param('id') id: string) {
    return this.paymentTypeService.deletePaymentType(id);
  }
}
