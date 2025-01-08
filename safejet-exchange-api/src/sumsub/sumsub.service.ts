import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import axios from 'axios';
import * as crypto from 'crypto';

interface SumsubWebhookPayload {
  type: string;
  applicantId: string;
  externalUserId: string;
  reviewStatus: string;
  reviewResult?: {
    reviewAnswer: 'GREEN' | 'RED';
    rejectLabels?: string[];
    reviewRejectType?: string;
  };
}

@Injectable()
export class SumsubService {
  private readonly baseUrl = 'https://api.sumsub.com';
  
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  private generateSignature(method: string, url: string, body: string = ''): string {
    const ts = Math.floor(Date.now() / 1000).toString();
    const secretKey = this.configService.get<string>('SUMSUB_SECRET_KEY');
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(ts + method + url + body)
      .digest('hex');
    return signature;
  }

  async generateAccessToken(userId: string): Promise<string> {
    try {
      const appToken = this.configService.get<string>('SUMSUB_APP_TOKEN');
      const url = '/resources/accessTokens';
      const method = 'POST';
      const body = JSON.stringify({
        userId,
        levelName: 'basic-kyc-level',
        ttlInSecs: 600, // 10 minutes
      });

      const response = await axios({
        method,
        url: `${this.baseUrl}${url}`,
        data: body,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-App-Token': appToken,
          'X-App-Access-Sig': this.generateSignature(method, url, body),
          'X-App-Access-Ts': Math.floor(Date.now() / 1000).toString(),
        },
      });

      return response.data.token;
    } catch (error) {
      console.error('Error generating Sumsub access token:', error);
      throw error;
    }
  }

  async handleWebhook(payload: SumsubWebhookPayload): Promise<void> {
    try {
      const { type, externalUserId, reviewStatus, reviewResult } = payload;

      const user = await this.userRepository.findOne({
        where: { id: externalUserId }
      });

      if (!user) {
        throw new Error(`User not found for ID: ${externalUserId}`);
      }

      switch (type) {
        case 'applicantReviewed':
        case 'applicantWorkflowCompleted':
          await this.handleVerificationComplete(user, reviewStatus, reviewResult);
          break;

        case 'applicantPending':
          await this.updateVerificationStatus(user, {
            status: 'processing',
            lastAttempt: new Date(),
          });
          break;

        case 'applicantCreated':
          user.kycData = {
            ...user.kycData,
            sumsubApplicantId: payload.applicantId,
          };
          await this.userRepository.save(user);
          break;

        case 'applicantOnHold':
          await this.updateVerificationStatus(user, {
            status: 'pending',
            lastAttempt: new Date(),
            reviewAnswer: 'ON_HOLD',
          });
          break;
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  private async handleVerificationComplete(
    user: User, 
    reviewStatus: string, 
    reviewResult?: { 
      reviewAnswer: string;
      rejectLabels?: string[];
      reviewRejectType?: string;
    }
  ): Promise<void> {
    const status = reviewResult?.reviewAnswer === 'GREEN' ? 'completed' : 'failed';
    
    await this.updateVerificationStatus(user, {
      status,
      lastAttempt: new Date(),
      reviewAnswer: reviewResult?.reviewAnswer,
      reviewRejectType: reviewResult?.reviewRejectType,
      reviewRejectDetails: reviewResult?.rejectLabels?.join(', '),
    });

    // Send email notification
    if (status === 'completed') {
      await this.emailService.sendVerificationSuccessEmail(user.email, user.fullName);
    } else {
      await this.emailService.sendVerificationFailedEmail(
        user.email,
        user.fullName,
        `Verification failed: ${reviewResult?.rejectLabels?.join(', ')}`
      );
    }
  }

  private async updateVerificationStatus(user: User, status: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    lastAttempt: Date;
    reviewAnswer?: string;
    reviewRejectType?: string;
    reviewRejectDetails?: string;
  }): Promise<void> {
    user.kycData = {
      ...user.kycData,
      verificationStatus: {
        ...user.kycData?.verificationStatus,
        identity: {
          ...user.kycData?.verificationStatus?.identity,
          ...status,
        },
      },
    };

    await this.userRepository.save(user);
  }

  async createApplicant(userId: string): Promise<string> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const url = '/resources/applicants';
      const method = 'POST';
      const body = JSON.stringify({
        externalUserId: userId,
        info: {
          firstName: user.kycData?.identityDetails?.firstName,
          lastName: user.kycData?.identityDetails?.lastName,
          dob: user.kycData?.identityDetails?.dateOfBirth,
        },
      });

      const response = await axios({
        method,
        url: `${this.baseUrl}${url}`,
        data: body,
        headers: this.getHeaders(method, url, body),
      });

      // Store the applicant ID
      user.kycData = {
        ...user.kycData,
        sumsubApplicantId: response.data.id,
      };
      await this.userRepository.save(user);

      return response.data.id;
    } catch (error) {
      console.error('Error creating Sumsub applicant:', error);
      throw new HttpException(
        'Failed to create applicant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getHeaders(method: string, url: string, body: string = '') {
    const ts = Math.floor(Date.now() / 1000).toString();
    const appToken = this.configService.get<string>('SUMSUB_APP_TOKEN');
    
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-App-Token': appToken,
      'X-App-Access-Sig': this.generateSignature(method, url, body),
      'X-App-Access-Ts': ts,
    };
  }

  async getApplicantStatus(applicantId: string): Promise<any> {
    try {
      const url = `/resources/applicants/${applicantId}/status`;
      const method = 'GET';

      const response = await axios({
        method,
        url: `${this.baseUrl}${url}`,
        headers: this.getHeaders(method, url),
      });

      return response.data;
    } catch (error) {
      console.error('Error getting applicant status:', error);
      throw new HttpException(
        'Failed to get applicant status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapReviewStatus(reviewStatus: string): 'pending' | 'completed' | 'failed' {
    switch (reviewStatus) {
      case 'approved':
        return 'completed';
      case 'rejected':
        return 'failed';
      default:
        return 'pending';
    }
  }
} 