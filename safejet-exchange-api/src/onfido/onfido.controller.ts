import { Controller, Post, UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnfidoService } from './onfido.service';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class OnfidoController {
  constructor(private readonly onfidoService: OnfidoService) {}

  @Post('onfido-token')
  async generateSdkToken(@GetUser() user: User) {
    // First create an applicant if not exists
    const [firstName, ...lastNameParts] = user.fullName.split(' ');
    const lastName = lastNameParts.join(' ');
    
    const applicant = await this.onfidoService.createApplicant(
      user.id,
      firstName,
      lastName
    );

    // Then generate SDK token
    const sdkToken = await this.onfidoService.generateSdkToken(applicant.data.id);
    
    return { token: sdkToken.data.token };
  }
} 