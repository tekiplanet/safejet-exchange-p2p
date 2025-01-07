import { Controller, Post, UseGuards, Get, Body, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnfidoService } from './onfido.service';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CountryCodes } from '@onfido/api';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class OnfidoController {
  constructor(private readonly onfidoService: OnfidoService) {}

  @Post('onfido-token')
  async generateSdkToken(@Body() body: {
    firstName: string;
    lastName: string;
    email: string;
    country: CountryCodes;
    type: string;
    returnUrl: string;
  }) {
    try {
      console.log('Received token generation request:', body);
      
      if (!body.firstName || !body.lastName || !body.email || !body.country) {
        throw new BadRequestException('Missing required fields');
      }

      // Validate country code
      if (!Object.values(CountryCodes).includes(body.country)) {
        throw new BadRequestException('Invalid country code');
      }

      // Create an applicant in Onfido
      const applicant = await this.onfidoService.createApplicant({
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        country: body.country,
      });

      console.log('Created Onfido applicant:', applicant);

      // Generate SDK token for the applicant
      const sdkToken = await this.onfidoService.generateSdkToken({
        applicant_id: applicant.id,
        referrer: body.returnUrl,
      });

      console.log('Generated SDK token');

      return { token: sdkToken.token };
    } catch (error) {
      console.error('Error generating SDK token:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }
} 