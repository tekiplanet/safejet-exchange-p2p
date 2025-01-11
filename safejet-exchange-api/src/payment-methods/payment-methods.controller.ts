import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { PaymentMethodTypeDto } from './dto/payment-method-type.dto';
import { FileService } from '../common/services/file.service';
import { Response } from 'express';
import { createReadStream } from 'fs';
import * as fs from 'fs';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly fileService: FileService,
  ) {}

  @Get('types')
  async getPaymentMethodTypes(): Promise<PaymentMethodTypeDto[]> {
    return this.paymentMethodsService.findAllTypes();
  }

  @Get('types/:id')
  async getPaymentMethodType(
    @Param('id') id: string,
  ): Promise<PaymentMethodTypeDto> {
    return this.paymentMethodsService.findOneType(id);
  }

  @Post()
  create(@GetUser() user: User, @Body() createDto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(user.id, createDto);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.paymentMethodsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@GetUser() user: User, @Param('id') id: string) {
    return this.paymentMethodsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  remove(@GetUser() user: User, @Param('id') id: string) {
    return this.paymentMethodsService.remove(user.id, id);
  }

  @Get('images/:filename')
  async serveImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const filepath = this.fileService.getFilePath(filename);
      if (!fs.existsSync(filepath)) {
        throw new NotFoundException('Image not found');
      }

      const file = createReadStream(filepath);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'max-age=3600',
      });
      file.pipe(res);
    } catch (error) {
      throw new NotFoundException('Image not found');
    }
  }

  @Get('check-image/:filename')
  async checkImage(@Param('filename') filename: string) {
    const filepath = this.fileService.getFilePath(filename);
    const exists = fs.existsSync(filepath);
    return {
      exists,
      filepath,
      size: exists ? fs.statSync(filepath).size : null
    };
  }
}
