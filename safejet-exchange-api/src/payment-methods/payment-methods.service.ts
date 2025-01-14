import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentMethodType } from './entities/payment-method-type.entity';
import { PaymentMethodTypeDto } from './dto/payment-method-type.dto';
import { FileService } from '../common/services/file.service';
import { EmailService } from '../email/email.service';
import { User } from '../auth/entities/user.entity';
import * as fs from 'fs';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(PaymentMethodType)
    private paymentMethodTypeRepository: Repository<PaymentMethodType>,
    private fileService: FileService,
    private emailService: EmailService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private authService: AuthService,
  ) {}

  private async verify2FAIfEnabled(userId: string, code?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      if (!code) {
        throw new BadRequestException('2FA verification required');
      }
      await this.authService.verify2FAAction(code, user);
    }
  }

  async create(userId: string, createDto: CreatePaymentMethodDto, twoFactorCode?: string) {
    // Verify 2FA first if enabled
    await this.verify2FAIfEnabled(userId, twoFactorCode);

    try {
      if (createDto.isDefault) {
        await this.resetDefaultStatus(userId);
      }

      const paymentMethodType = await this.paymentMethodTypeRepository.findOne({
        where: { id: createDto.paymentMethodTypeId },
        relations: ['fields'],
      });

      if (!paymentMethodType) {
        throw new NotFoundException('Payment method type not found');
      }

      // Process image fields
      const processedDetails = { ...createDto.details };
      for (const field of paymentMethodType.fields) {
        if (field.type === 'image') {
          const detail = processedDetails[field.name];
          if (detail?.value) {
            try {
              console.log(`Processing image for field ${field.name}`);
              
              // Validate base64 image
              if (!this.isValidBase64Image(detail.value)) {
                console.error(`Invalid image format for ${field.name}`);
                throw new BadRequestException(`Invalid image format for ${field.name}`);
              }

              // Save image and store filename
              const filename = await this.fileService.saveBase64Image(detail.value);
              processedDetails[field.name] = {
                ...detail,
                value: filename,
              };
            } catch (error) {
              console.error(`Image processing error for ${field.name}:`, error);
              throw new BadRequestException(`Failed to process image for ${field.name}`);
            }
          }
        }
      }

      const paymentMethod = this.paymentMethodRepository.create({
        userId,
        name: createDto.name,
        paymentMethodType,
        isDefault: createDto.isDefault,
        details: processedDetails,
      });

      const savedMethod = await this.paymentMethodRepository.save(paymentMethod);

      // Get user details for email
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.emailService.sendPaymentMethodAddedEmail(
          user.email,
          user.fullName,
          savedMethod.name,
        );
      }

      // Return the complete payment method with all relations, just like in update
      return this.findOne(userId, savedMethod.id);
    } catch (error) {
      console.error('Payment method creation error:', error);
      throw error;
    }
  }

  private isValidBase64Image(base64String: string): boolean {
    try {
      // Check if it's a valid base64 string
      const buffer = Buffer.from(base64String.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      
      // Check file size (max 5MB)
      if (buffer.length > 5 * 1024 * 1024) {
        return false;
      }

      // Check if it starts with image mime type
      if (!base64String.match(/^data:image\/(jpeg|jpg|png|gif);base64,/)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  findAll(userId: string) {
    return this.paymentMethodRepository.find({
      where: { userId },
      relations: ['paymentMethodType', 'paymentMethodType.fields'],
      order: {
        updatedAt: 'DESC'
      }
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

  private isExistingFile(filename: string): boolean {
    try {
      // Check if the file exists in our uploads directory
      const filepath = this.fileService.getFilePath(filename);
      return fs.existsSync(filepath);
    } catch (error) {
      return false;
    }
  }

  async update(userId: string, id: string, updateDto: UpdatePaymentMethodDto, twoFactorCode?: string) {
    // Verify 2FA first if enabled
    await this.verify2FAIfEnabled(userId, twoFactorCode);

    const paymentMethod = await this.findOne(userId, id);
    const paymentMethodType = await this.paymentMethodTypeRepository.findOne({
      where: { id: paymentMethod.paymentMethodTypeId },
      relations: ['fields'],
    });

    if (updateDto.isDefault) {
      await this.resetDefaultStatus(userId);
    }

    // Process image fields
    const processedDetails = { ...updateDto.details };
    if (processedDetails) {
      for (const field of paymentMethodType.fields) {
        if (field.type === 'image') {
          const detail = processedDetails[field.name];
          if (detail?.value) {
            // If it's an existing file, keep it as is
            if (this.isExistingFile(detail.value)) {
              continue;
            }

            try {
              // Try to process as new image
              const filename = await this.fileService.saveBase64Image(detail.value);
              processedDetails[field.name] = {
                ...detail,
                value: filename,
              };
            } catch (error) {
              console.error(`Error processing image for ${field.name}:`, error);
              throw new BadRequestException(`Failed to process image for ${field.name}`);
            }
          }
        }
      }
    }

    Object.assign(paymentMethod, {
      ...updateDto,
      details: processedDetails
    });
    
    const updatedMethod = await this.paymentMethodRepository.save(paymentMethod);

    // Send email notification
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await this.emailService.sendPaymentMethodUpdatedEmail(
        user.email,
        user.fullName,
        updatedMethod.name,
      );
    }

    return updatedMethod;
  }

  async remove(userId: string, id: string, twoFactorCode?: string) {
    // Verify 2FA first if enabled
    await this.verify2FAIfEnabled(userId, twoFactorCode);

    const paymentMethod = await this.findOne(userId, id);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    // Store the name before deletion
    const methodName = paymentMethod.name;
    
    // Delete associated image files
    const paymentMethodType = await this.paymentMethodTypeRepository.findOne({
      where: { id: paymentMethod.paymentMethodTypeId },
      relations: ['fields'],
    });

    if (paymentMethodType) {
      for (const field of paymentMethodType.fields) {
        if (field.type === 'image') {
          const filename = paymentMethod.details[field.name]?.value;
          if (filename) {
            await this.fileService.deleteFile(filename);
          }
        }
      }
    }

    await this.paymentMethodRepository.remove(paymentMethod);

    // Send email notification
    if (user) {
      await this.emailService.sendPaymentMethodDeletedEmail(
        user.email,
        user.fullName,
        methodName,
      );
    }

    return { success: true };
  }

  private async resetDefaultStatus(userId: string) {
    await this.paymentMethodRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );
  }

  // New methods for payment method types
  async findAllTypes(): Promise<PaymentMethodType[]> {
    return this.paymentMethodTypeRepository.find({
      where: { isActive: true },
      relations: ['fields'],
      order: {
        name: 'ASC',
        fields: {
          order: 'ASC',
        },
      },
    });
  }

  async findOneType(id: string): Promise<PaymentMethodType> {
    const type = await this.paymentMethodTypeRepository.findOne({
      where: { id, isActive: true },
      relations: ['fields'],
    });

    if (!type) {
      throw new NotFoundException('Payment method type not found');
    }

    return type;
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
