import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WalletService } from './wallet.service';
import { CreateWalletEvent } from './events/create-wallet.event';

@Injectable()
export class WalletListener {
  constructor(private readonly walletService: WalletService) {}

  @OnEvent('user.registered')
  async handleWalletCreation(event: CreateWalletEvent) {
    try {
      console.log(`Starting background wallet creation for user ${event.userId}`);
      
      const walletPromises = event.blockchains.flatMap(blockchain =>
        event.networks.map(network =>
          this.walletService.createWallet(event.userId, { blockchain, network })
            .then(wallet => {
              console.log(`Created ${blockchain} ${network} wallet for user ${event.userId}`);
              return wallet;
            })
            .catch(error => {
              console.error(`Failed to create ${blockchain} ${network} wallet:`, error);
              return null;
            })
        )
      );

      const results = await Promise.all(walletPromises);
      console.log(`Completed wallet creation for user ${event.userId}:`, {
        total: results.length,
        successful: results.filter(Boolean).length,
        failed: results.filter(r => !r).length
      });
    } catch (error) {
      console.error('Background wallet creation error:', error);
    }
  }
} 