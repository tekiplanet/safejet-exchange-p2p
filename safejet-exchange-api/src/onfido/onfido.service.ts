import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DefaultApi, Configuration, Region, CountryCodes } from '@onfido/api';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { KYCLevel } from '../auth/entities/kyc-level.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class OnfidoService {
  private readonly onfido: DefaultApi;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(KYCLevel)
    private readonly kycLevelRepository: Repository<KYCLevel>,
    private readonly emailService: EmailService,
  ) {
    this.onfido = new DefaultApi(
      new Configuration({
        apiToken: this.configService.get<string>('ONFIDO_API_TOKEN'),
        region: Region.EU,
        baseOptions: { timeout: 60000 }
      })
    );
  }

  async createApplicant(data: {
    first_name: string;
    last_name: string;
    email: string;
    country: CountryCodes;
  }) {
    const applicant = await this.onfido.createApplicant({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      location: {
        country_of_residence: data.country as CountryCodes,
      },
    });
    return applicant.data;
  }

  async generateSdkToken(data: {
    applicant_id: string;
    referrer: string;
  }) {
    const response = await this.onfido.generateSdkToken({
      applicant_id: data.applicant_id,
      referrer: data.referrer,
    });
    return response.data;
  }

  async handleCheckCompletion(payload: any) {
    try {
      const { status, result, applicant_id, document_type } = payload;
      
      const user = await this.userRepository.findOne({
        where: {
          kycData: Raw(alias => `${alias}->>'onfidoApplicantId' = :applicantId`, {
            applicantId: applicant_id
          })
        }
      });

      if (!user) {
        throw new Error('User not found for applicant ID');
      }

      // Update verification status
      const isAddressDocument = document_type.toLowerCase().includes('proof_of_address');
      const verificationKey = isAddressDocument ? 'address' : 'identity';
      
      user.kycData = {
        ...user.kycData,
        verificationStatus: {
          ...user.kycData?.verificationStatus,
          [verificationKey]: {
            status: status === 'complete' && result === 'clear' ? 'completed' : 'failed',
            documentType: document_type,
            lastAttempt: new Date(),
            failureReason: status === 'complete' && result !== 'clear' ? result : undefined,
          },
        },
      };

      await this.userRepository.save(user);

      // Check if both verifications are complete
      if (user.kycData?.verificationStatus?.identity?.status === 'completed' &&
          user.kycData?.verificationStatus?.address?.status === 'completed') {
        await this.upgradeUserKYCLevel(user);
      }
    } catch (error) {
      console.error('Error handling check completion:', error);
      throw error;
    }
  }

  async handleReportCompletion(payload: any) {
    console.log('Report completed:', payload);
    // Implement if needed
  }

  private async upgradeUserKYCLevel(user: User) {
    const level2 = await this.kycLevelRepository.findOne({ 
      where: { level: 2 } 
    });

    if (level2) {
      user.kycLevel = 2;
      user.kycLevelDetails = level2;
      await this.userRepository.save(user);

      await this.emailService.sendKYCLevelUpgradeEmail(
        user.email,
        user.fullName,
        2
      );
    }
  }
} 