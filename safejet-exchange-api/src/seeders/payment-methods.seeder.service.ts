import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodType } from '../payment-methods/entities/payment-method-type.entity';
import { PaymentMethodField } from '../payment-methods/entities/payment-method-field.entity';

@Injectable()
export class PaymentMethodsSeederService {
  constructor(
    @InjectRepository(PaymentMethodType)
    private paymentMethodTypeRepository: Repository<PaymentMethodType>,
    @InjectRepository(PaymentMethodField)
    private paymentMethodFieldRepository: Repository<PaymentMethodField>,
  ) {}

  async seed() {
    const paymentMethodTypes = [
      {
        name: 'Bank Transfer',
        icon: 'bank',
        description: 'Traditional bank transfer payment method',
        fields: [
          {
            name: 'bankName',
            label: 'Bank Name',
            type: 'text',
            isRequired: true,
            order: 1,
          },
          {
            name: 'accountName',
            label: 'Account Name',
            type: 'text',
            isRequired: true,
            order: 2,
          },
          {
            name: 'accountNumber',
            label: 'Account Number',
            type: 'text',
            validationRules: {
              minLength: 10,
              maxLength: 10,
              pattern: '^[0-9]*$',
            },
            isRequired: true,
            order: 3,
          },
        ],
      },
      {
        name: 'PayPal',
        icon: 'paypal',
        description: 'PayPal payment method',
        fields: [
          {
            name: 'email',
            label: 'PayPal Email',
            type: 'email',
            validationRules: {
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            },
            isRequired: true,
            order: 1,
          },
          {
            name: 'accountName',
            label: 'Account Name',
            type: 'text',
            helpText: 'Full name as shown on your PayPal account',
            isRequired: true,
            order: 2,
          },
        ],
      },
      {
        name: 'Mobile Money',
        icon: 'mobile',
        description: 'Mobile money transfer payment method',
        fields: [
          {
            name: 'provider',
            label: 'Provider',
            type: 'select',
            validationRules: {
              options: ['MTN', 'Airtel', 'Vodafone'],
            },
            isRequired: true,
            order: 1,
          },
          {
            name: 'phoneNumber',
            label: 'Phone Number',
            type: 'text',
            validationRules: {
              pattern: '^[0-9]{10}$',
            },
            helpText: 'Enter your mobile money number',
            isRequired: true,
            order: 2,
          },
          {
            name: 'accountName',
            label: 'Account Name',
            type: 'text',
            helpText: 'Name registered with the mobile money account',
            isRequired: true,
            order: 3,
          },
        ],
      },
    ];

    for (const typeData of paymentMethodTypes) {
      const { fields, ...paymentMethodTypeData } = typeData;

      // Create payment method type
      const paymentMethodType = await this.paymentMethodTypeRepository.save(
        this.paymentMethodTypeRepository.create(paymentMethodTypeData),
      );

      // Create fields for this payment method type
      const fieldPromises = fields.map((fieldData) =>
        this.paymentMethodFieldRepository.save(
          this.paymentMethodFieldRepository.create({
            ...fieldData,
            paymentMethodType,
          }),
        ),
      );

      await Promise.all(fieldPromises);
    }
  }
}
