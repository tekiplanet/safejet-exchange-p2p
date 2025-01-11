import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
  ) {}

  async create(UserId: string, createDto: CreatePaymentMethodDto) {
    // If this is the first payment method or marked as default, handle default status
    if (createDto.IsDefault) {
      await this.resetDefaultStatus(UserId);
    }

    const paymentMethod = this.paymentMethodRepository.create({
      ...createDto,
      UserId,
    });

    return this.paymentMethodRepository.save(paymentMethod);
  }

  async findAll(UserId: string) {
    return this.paymentMethodRepository.find({
      where: { UserId },
      order: { CreatedAt: 'DESC' },
    });
  }

  async findOne(UserId: string, Id: string) {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { Id, UserId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    return paymentMethod;
  }

  async update(UserId: string, Id: string, updateDto: UpdatePaymentMethodDto) {
    const paymentMethod = await this.findOne(UserId, Id);

    // Handle default status changes
    if (updateDto.IsDefault) {
      await this.resetDefaultStatus(UserId);
    }

    Object.assign(paymentMethod, updateDto);
    return this.paymentMethodRepository.save(paymentMethod);
  }

  async remove(UserId: string, Id: string) {
    const paymentMethod = await this.findOne(UserId, Id);
    return this.paymentMethodRepository.remove(paymentMethod);
  }

  private async resetDefaultStatus(UserId: string) {
    await this.paymentMethodRepository.update(
      { UserId, IsDefault: true },
      { IsDefault: false },
    );
  }
} 