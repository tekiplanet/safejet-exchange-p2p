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
            name: 'accountNumber',
            label: 'Account Number',
            type: 'number',
            isRequired: true,
            order: 2,
            validationRules: {
              min: 1000000000,  // 10 digits minimum
              max: 9999999999999  // 13 digits maximum
            }
          }
        ],
      },
      {
        name: 'Mobile Money',
        icon: 'mobile',
        description: 'Mobile money transfer services',
        fields: [
          {
            name: 'provider',
            label: 'Service Provider',
            type: 'select',
            isRequired: true,
            order: 1,
            validationRules: {
              options: [
                { value: 'mtn', label: 'MTN Mobile Money' },
                { value: 'airtel', label: 'Airtel Money' },
                { value: 'glo', label: 'Glo Money' }
              ]
            }
          },
          {
            name: 'phoneNumber',
            label: 'Phone Number',
            type: 'phone',
            isRequired: true,
            order: 2,
            placeholder: 'Enter your mobile money number'
          }
        ],
      },
      {
        name: 'QR Payment',
        icon: 'qr_code',
        description: 'QR code based payments',
        fields: [
          {
            name: 'qrCode',
            label: 'Payment QR Code',
            type: 'image',
            isRequired: true,
            order: 1,
            validationRules: {
              maxSize: 5242880, // 5MB in bytes
              allowedTypes: ['image/png', 'image/jpeg', 'image/jpg']
            }
          },
          {
            name: 'expiryDate',
            label: 'QR Code Expiry Date',
            type: 'date',
            isRequired: true,
            order: 2
          },
          {
            name: 'instructions',
            label: 'Payment Instructions',
            type: 'text',
            isRequired: true,
            order: 3,
            validationRules: {
              maxLines: 5
            }
          }
        ],
      },
      {
        name: 'PayPal',
        icon: 'payment',
        description: 'PayPal payment service',
        fields: [
          {
            name: 'email',
            label: 'PayPal Email',
            type: 'email',
            isRequired: true,
            order: 1,
            placeholder: 'Enter your PayPal email address'
          }
        ],
      }
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
