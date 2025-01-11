import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentMethodType } from './entities/payment-method-type.entity';
import { PaymentMethodTypeDto } from './dto/payment-method-type.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(PaymentMethodType)
    private paymentMethodTypeRepository: Repository<PaymentMethodType>,
  ) {}

  async create(userId: string, createDto: CreatePaymentMethodDto) {
    if (createDto.isDefault) {
      await this.resetDefaultStatus(userId);
    }

    const paymentMethodType = await this.paymentMethodTypeRepository.findOne({
      where: { id: createDto.paymentMethodTypeId },
    });

    if (!paymentMethodType) {
      throw new NotFoundException('Payment method type not found');
    }

    const paymentMethod = this.paymentMethodRepository.create({
      userId,
      paymentMethodType,
      isDefault: createDto.isDefault,
      details: createDto.details,
    });

    return this.paymentMethodRepository.save(paymentMethod);
  }

  findAll(userId: string) {
    return this.paymentMethodRepository.find({
      where: { userId },
      relations: ['paymentMethodType', 'paymentMethodType.fields'],
    });
  }

  async findOne(userId: string, id: string) {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
      relations: ['paymentMethodType', 'paymentMethodType.fields'],
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    return paymentMethod;
  }

  async update(userId: string, id: string, updateDto: UpdatePaymentMethodDto) {
    const paymentMethod = await this.findOne(userId, id);

    if (updateDto.isDefault) {
      await this.resetDefaultStatus(userId);
    }

    Object.assign(paymentMethod, updateDto);
    return this.paymentMethodRepository.save(paymentMethod);
  }

  async remove(userId: string, id: string) {
    const paymentMethod = await this.findOne(userId, id);
    return this.paymentMethodRepository.remove(paymentMethod);
  }

  private async resetDefaultStatus(userId: string) {
    await this.paymentMethodRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );
  }

  // New methods for payment method types
  async findAllTypes(): Promise<PaymentMethodTypeDto[]> {
    const types = await this.paymentMethodTypeRepository.find({
      where: { isActive: true },
      relations: ['fields'],
      order: {
        name: 'ASC',
        fields: {
          order: 'ASC',
        },
      },
    });

    return types.map((type) => this.mapToDto(type));
  }

  async findOneType(id: string): Promise<PaymentMethodTypeDto> {
    const type = await this.paymentMethodTypeRepository.findOne({
      where: { id, isActive: true },
      relations: ['fields'],
    });

    if (!type) {
      throw new NotFoundException('Payment method type not found');
    }

    return this.mapToDto(type);
  }

  private mapToDto(type: PaymentMethodType): PaymentMethodTypeDto {
    return {
      id: type.id,
      name: type.name,
      icon: type.icon,
      description: type.description,
      isActive: type.isActive,
      fields: type.fields.map((field) => ({
        id: field.id,
        name: field.name,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        validationRules: field.validationRules,
        isRequired: field.isRequired,
        order: field.order,
      })),
    };
  }
}
