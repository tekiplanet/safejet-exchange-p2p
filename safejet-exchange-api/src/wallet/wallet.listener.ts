import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WalletService } from './wallet.service';
import { CreateWalletEvent } from './events/create-wallet.event';

@Injectable()
export class WalletListener {
  private readonly logger = new Logger(WalletListener.name);

  constructor(private readonly walletService: WalletService) {}

  @OnEvent('create.wallet')
  async handleWalletCreation(event: CreateWalletEvent) {
    this.logger.log(`Triggered background wallet creation for user: ${event.userId}`);
    
    try {
      this.logger.log(`Starting background wallet creation for user ${event.userId}`);
      const result = await this.walletService.createWalletsForUser(event.userId);
      this.logger.log(`Completed wallet creation for user ${event.userId}: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Failed wallet creation for user ${event.userId}: ${error.message}`);
    }
  }
} 