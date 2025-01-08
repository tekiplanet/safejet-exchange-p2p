import { Controller, Post, UseGuards, Get, BadRequestException, NotFoundException, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnfidoService } from './onfido.service';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class OnfidoController {
  constructor(
    private readonly onfidoService: OnfidoService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  @Post('onfido-token')
  async generateSdkToken(@GetUser() user: User) {
    try {
      // Get fresh user data from database
      const freshUser = await this.userRepository.findOne({
        where: { id: user.id }
      });

      if (!freshUser) {
        throw new NotFoundException('User not found');
      }

      // Get the user's identity details
      if (!freshUser.kycData?.identityDetails) {
        throw new BadRequestException('Please submit identity details first');
      }

      const { firstName, lastName } = freshUser.kycData.identityDetails;
      
      console.log('Creating Onfido applicant for:', { firstName, lastName });

      const applicant = await this.onfidoService.createApplicant(
        user.id,
        firstName,
        lastName
      );

      // Then generate SDK token
      const sdkToken = await this.onfidoService.generateSdkToken(applicant.data.id);
      
      return { token: sdkToken.data.token };
    } catch (error) {
      console.error('Error generating SDK token:', error);
      throw error;
    }
  }

  @Post('submit-verification')
  @UseGuards(JwtAuthGuard)
  async submitVerification(
    @GetUser() user: User,
    @Body() data: { documentResults: any; verificationType: string }
  ) {
    try {
      // Update user's verification status to pending
      await this.userRepository.update(user.id, {
        kycData: {
          identityDetails: user.kycData?.identityDetails,
          verificationStatus: {
            identity: {
              status: 'pending',
              lastAttempt: new Date(),
              documentId: data.documentResults[0].document.front.id,
              faceId: data.documentResults[0].face.id,
            }
          }
        }
      });

      // Create Onfido check
      await this.onfidoService.createCheck(
        data.documentResults[0].document.front.id,
        data.documentResults[0].face.id,
        user.kycData?.onfidoApplicantId,
      );

      return {
        status: 'pending',
        message: 'Your documents are being verified. This may take a few minutes.'
      };
    } catch (error) {
      console.error('Error submitting verification:', error);
      throw error;
    }
  }

  @Get('verification-status')
  @UseGuards(JwtAuthGuard)
  async getVerificationStatus(@GetUser() user: User) {
    try {
      const freshUser = await this.userRepository.findOne({
        where: { id: user.id }
      });

      if (!freshUser) {
        throw new NotFoundException('User not found');
      }

      const status = freshUser.kycData?.verificationStatus?.identity;
      
      if (!status) {
        return {
          status: 'not_started',
          message: 'Verification not started'
        };
      }

      switch (status.status) {
        case 'pending':
          return {
            status: 'pending',
            message: 'Your documents are being verified'
          };
        case 'completed':
          return {
            status: 'completed',
            message: 'Verification completed successfully'
          };
        case 'failed':
          return {
            status: 'failed',
            message: status.failureReason || 'Verification failed'
          };
        default:
          return {
            status: 'unknown',
            message: 'Unknown verification status'
          };
      }
    } catch (error) {
      console.error('Error getting verification status:', error);
      throw error;
    }
  }
} 