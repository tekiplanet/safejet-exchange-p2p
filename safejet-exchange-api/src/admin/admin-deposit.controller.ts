import { Controller, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { DepositTrackingService } from '../wallet/services/deposit-tracking.service';

@Controller('admin/deposit')
@UseGuards(AdminGuard)
export class AdminDepositController {
  constructor(private depositTrackingService: DepositTrackingService) {}

  @Post('start-monitoring')
  async startMonitoring() {
    await this.depositTrackingService.startMonitoring();
    return { message: 'Deposit monitoring started successfully' };
  }

  @Post('stop-monitoring')
  async stopMonitoring() {
    return await this.depositTrackingService.stopMonitoringDeposits();
  }
} 