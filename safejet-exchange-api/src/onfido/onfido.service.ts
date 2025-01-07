import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DefaultApi, Configuration, Region } from '@onfido/api';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Repository, Raw } from 'typeorm';
import { KYCLevel } from '../auth/entities/kyc-level.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class OnfidoService {
  private onfido: DefaultApi;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(KYCLevel)
    private kycLevelRepository: Repository<KYCLevel>,
    private emailService: EmailService,
  ) {
    this.onfido = new DefaultApi(
      new Configuration({
        apiToken: this.configService.get<string>('ONFIDO_API_TOKEN'),
        region: Region.EU, // or Region.US based on your region
        baseOptions: { timeout: 60_000 } // 60 second timeout
      })
    );
  }

  async generateSdkToken(applicantId: string) {
    try {
      const response = await this.onfido.generateSdkToken({
        applicant_id: applicantId,
        referrer: '*://*/*', // Adjust based on your app's domains
      });
      
      return response;
    } catch (error) {
      console.error('Onfido SDK token generation error:', error);
      throw error;
    }
  }

  async createApplicant(userId: string, firstName: string, lastName: string) {
    try {
      const applicant = await this.onfido.createApplicant({
        first_name: firstName,
        last_name: lastName
      });
      
      // Store the applicant ID in the user's kycData
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        user.kycData = {
          ...user.kycData,
          onfidoApplicantId: applicant.data.id
        };
        await this.userRepository.save(user);
      }
      
      return applicant;
    } catch (error) {
      console.error('Onfido applicant creation error:', error);
      throw error;
    }
  }

  async handleCheckCompletion(payload: any) {
    try {
      const { status, result, applicant_id, document_type, extracted_data } = payload;
      
      const isAddressDocument = document_type.toLowerCase().includes('proof_of_address');
      
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

      // Validate document details against submitted details
      if (status === 'complete' && extracted_data) {
        const identityDetails = user.kycData?.identityDetails;
        if (identityDetails) {
          const detailsMatch = this.validateDocumentDetails(
            identityDetails,
            extracted_data,
            document_type
          );
          
          if (!detailsMatch) {
            user.kycData = {
              ...user.kycData,
              verificationStatus: {
                ...user.kycData?.verificationStatus,
                [isAddressDocument ? 'address' : 'identity']: {
                  status: 'failed',
                  documentType: document_type,
                  lastAttempt: new Date(),
                  failureReason: 'Document details do not match submitted information',
                },
              },
            };
            await this.userRepository.save(user);
            return;
          }
        }
      }

      // Update verification status based on document type
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

      // Only update KYC level if both verifications are complete
      const bothVerificationsComplete = 
        user.kycData?.verificationStatus?.identity?.status === 'completed' &&
        user.kycData?.verificationStatus?.address?.status === 'completed';

      if (bothVerificationsComplete) {
        // Update user's KYC level to 2
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

      await this.userRepository.save(user);
    } catch (error) {
      console.error('Error handling check completion:', error);
      throw error;
    }
  }

  async handleReportCompletion(payload: any) {
    // Handle individual report completions if needed
    console.log('Report completed:', payload);
  }

  private validateDocumentDetails(
    submittedDetails: any,
    extractedData: any,
    documentType: string
  ): boolean {
    // Normalize strings for comparison
    const normalize = (str: string) => 
      str.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (documentType.toLowerCase().includes('proof_of_address')) {
      // Validate address details
      const submittedAddress = normalize(
        `${submittedDetails.address} ${submittedDetails.city} ${submittedDetails.state}`
      );
      const extractedAddress = normalize(extractedData.address || '');
      
      return submittedAddress.includes(extractedAddress) || 
             extractedAddress.includes(submittedAddress);
    } else {
      // Validate identity document details
      const nameMatches = 
        normalize(extractedData.first_name || '').includes(normalize(submittedDetails.firstName)) &&
        normalize(extractedData.last_name || '').includes(normalize(submittedDetails.lastName));

      const dobMatches = extractedData.date_of_birth === submittedDetails.dateOfBirth;

      return nameMatches && dobMatches;
    }
  }

  async startDocumentVerification(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check cooldown period (15 minutes)
    const lastAttempt = user.kycData?.verificationStatus?.identity?.lastAttempt;
    if (lastAttempt) {
      const cooldownPeriod = 15 * 60 * 1000; // 15 minutes in milliseconds
      const timeSinceLastAttempt = Date.now() - new Date(lastAttempt).getTime();
      
      if (timeSinceLastAttempt < cooldownPeriod) {
        const minutesRemaining = Math.ceil((cooldownPeriod - timeSinceLastAttempt) / 60000);
        throw new Error(`Please wait ${minutesRemaining} minutes before retrying`);
      }
    }

    // ... rest of the verification logic
  }

  async startAddressVerification(userId: string) {
    // Similar cooldown check for address verification
    // ... implementation
  }
} 