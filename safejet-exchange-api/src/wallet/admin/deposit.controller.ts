import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { DepositTrackingService } from '../services/deposit-tracking.service';

@Controller('admin/deposits')
@UseGuards(AdminGuard)
export class AdminDepositController {
  constructor(
    private readonly depositTrackingService: DepositTrackingService,
  ) {}

  @Get('status')
  async getDepositTrackingStatus() {
    try {
      const status = {
        ethereum: await this.testConnection('ethereum'),
        bsc: await this.testConnection('bsc'),
        bitcoin: await this.testConnection('bitcoin'),
        tron: await this.testConnection('trx'),
      };
      
      return {
        success: true,
        message: 'Deposit tracking status',
        data: status
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error checking deposit tracking status',
        error: error.message
      };
    }
  }

  private async testConnection(chain: string) {
    try {
      const result = await this.depositTrackingService.testConnection(chain);
      return {
        connected: true,
        latestBlock: result.blockNumber,
        network: result.network
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
} 