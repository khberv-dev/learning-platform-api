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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/core/user/enum/user-role.enum';
import { PaymentTypeService } from '@/core/payment/services/payment-type.service';
import { CreatePaymentTypeDto } from '@/core/payment/dto/create-payment-type.dto';
import { UpdatePaymentTypeDto } from '@/core/payment/dto/update-payment-type.dto';
import { iconFileFilter, paymentTypeIconStorage, toIconPath } from '@/core/payment/storage/payment-type-icon.storage';

const iconUpload = () =>
  UseInterceptors(FileInterceptor('icon', { storage: paymentTypeIconStorage, fileFilter: iconFileFilter }));

const paymentTypeFormSchema = (required: string[] = ['title', 'url']) => ({
  schema: {
    type: 'object',
    required,
    properties: {
      title: { type: 'string' },
      url: { type: 'string' },
      isActive: { type: 'boolean' },
      icon: { type: 'string', format: 'binary' },
    },
  },
});

const paymentTypeExample = {
  id: 'pt000000-0000-0000-0000-000000000001',
  icon: '/payment-type/payme.png',
  title: 'Payme',
  url: 'https://payme.uz/checkout',
  isActive: true,
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

@ApiTags('payment-types')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/payment-types')
export class AdminPaymentTypeController {
  constructor(private readonly paymentTypeService: PaymentTypeService) {}

  @Post()
  @iconUpload()
  @ApiConsumes('multipart/form-data')
  @ApiBody(paymentTypeFormSchema())
  @ApiCreatedResponse({ schema: { example: paymentTypeExample } })
  createPaymentType(@Body() dto: CreatePaymentTypeDto, @UploadedFile() file?: Express.Multer.File) {
    return this.paymentTypeService.createPaymentType(dto, file && toIconPath(file.filename));
  }

  @Get()
  @ApiOkResponse({ schema: { example: [paymentTypeExample] } })
  findAllPaymentTypes() {
    return this.paymentTypeService.findAllPaymentTypes();
  }

  @Get(':id')
  @ApiOkResponse({ schema: { example: paymentTypeExample } })
  findOnePaymentType(@Param('id') id: string) {
    return this.paymentTypeService.findOnePaymentType(id);
  }

  @Patch(':id')
  @iconUpload()
  @ApiConsumes('multipart/form-data')
  @ApiBody(paymentTypeFormSchema([]))
  @ApiOkResponse({ schema: { example: paymentTypeExample } })
  updatePaymentType(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentTypeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.paymentTypeService.updatePaymentType(id, dto, file && toIconPath(file.filename));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  deletePaymentType(@Param('id') id: string) {
    return this.paymentTypeService.deletePaymentType(id);
  }
}
