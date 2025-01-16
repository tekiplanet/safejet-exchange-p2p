import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import * as xrpl from 'xrpl';
const TronWeb = require('tronweb');
import * as crypto from 'crypto';
import { WalletKey } from './entities/wallet-key.entity';
import { BLOCKCHAIN_CONFIGS } from './blockchain.config';

const ECPair = ECPairFactory(ecc);

@Injectable()
export class KeyManagementService {
  private readonly tronWeb: any;

  constructor(
    @InjectRepository(WalletKey)
    private walletKeyRepository: Repository<WalletKey>,
    private configService: ConfigService,
  ) {
    // Initialize TronWeb with proper configuration
    const tronApiKey = this.configService.get<string>('TRON_API_KEY');
    const fullNode = BLOCKCHAIN_CONFIGS.trx.mainnet.rpcUrl;

    // Create TronWeb instance
    this.tronWeb = new TronWeb({
      fullHost: fullNode,
      headers: { "TRON-PRO-API-KEY": tronApiKey }
    });
  }

  async generateWallet(userId: string, blockchain: string, network: string = 'mainnet'): Promise<{ address: string; keyId: string }> {
    let wallet;
    let privateKey;
    let address;
    
    try {
      switch (blockchain.toLowerCase()) {
        case 'ethereum':
          wallet = ethers.Wallet.createRandom();
          privateKey = wallet.privateKey;
          address = wallet.address;
          // Network doesn't affect address generation, but we'll store it for reference
          break;

        case 'bsc':
          wallet = ethers.Wallet.createRandom();
          privateKey = wallet.privateKey;
          address = wallet.address;
          // BSC uses same address format for both networks
          break;

        case 'bitcoin':
          // Use different network parameters for testnet
          const btcNetwork = network === 'testnet' ? 
            bitcoin.networks.testnet : 
            bitcoin.networks.bitcoin;
          
          const keyPair = ECPair.makeRandom({ network: btcNetwork });
          const { address: btcAddress } = bitcoin.payments.p2pkh({ 
            pubkey: keyPair.publicKey,
            network: btcNetwork,
          });
          privateKey = keyPair.privateKey?.toString('hex');
          address = btcAddress;
          break;

        case 'xrp':
          if (network === 'testnet') {
            // Connect to testnet for address generation
            const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
            await client.connect();
            const fundResult = await client.fundWallet();
            await client.disconnect();
            
            privateKey = fundResult.wallet.privateKey;
            address = fundResult.wallet.address;
          } else {
            const xrpWallet = xrpl.Wallet.generate();
            privateKey = xrpWallet.privateKey;
            address = xrpWallet.address;
          }
          break;

        case 'trx':
          try {
            console.log(`Creating TRON wallet for ${network}...`);
            
            // Use different network configuration for testnet
            const tronConfig = network === 'testnet' ? 
              BLOCKCHAIN_CONFIGS.trx.testnet : 
              BLOCKCHAIN_CONFIGS.trx.mainnet;
            
            // Create network-specific TronWeb instance
            const networkTronWeb = new TronWeb({
              fullHost: tronConfig.rpcUrl,
              headers: { "TRON-PRO-API-KEY": this.configService.get<string>('TRON_API_KEY') }
            });
            
            const account = await networkTronWeb.createAccount();
            console.log('TRON account created:', account);
            
            if (!account.privateKey || !account.address.base58) {
              throw new Error('Failed to generate TRON wallet');
            }

            privateKey = account.privateKey;
            address = account.address.base58;
            
            console.log('TRON wallet created successfully:', {
              address: address,
              network: network
            });
          } catch (error) {
            console.error('TRON wallet creation error:', error);
            throw new Error(`Failed to create TRON wallet: ${error.message}`);
          }
          break;

        default:
          throw new Error(`Unsupported blockchain: ${blockchain}`);
      }

      if (!privateKey || !address) {
        throw new Error('Failed to generate wallet');
      }

      // Encrypt private key
      const userSecret = this.generateUserSecret(userId);
      const encryptedKey = await this.encryptPrivateKey(privateKey, userSecret);

      // Save encrypted key with network information
      const walletKey = await this.walletKeyRepository.save({
        userId,
        encryptedPrivateKey: encryptedKey,
        encryptionVersion: 1,
        keyType: 'hot',
        backupData: {
          blockchain,
          network,
          createdAt: new Date(),
        },
      });

      return {
        address,
        keyId: walletKey.id,
      };
    } catch (error) {
      console.error(`Failed to generate ${blockchain} wallet on ${network}:`, error);
      throw error;
    }
  }

  private generateUserSecret(userId: string): string {
    const masterKey = this.configService.get<string>('ENCRYPTION_KEY_SECRET');
    if (!masterKey) {
      throw new Error('Encryption key not configured');
    }

    return crypto
      .createHmac('sha256', masterKey)
      .update(userId)
      .digest('hex');
  }

  private async encryptPrivateKey(privateKey: string, userSecret: string): Promise<string> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(userSecret.slice(0, 32)),
      iv
    );

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  async decryptPrivateKey(encryptedKey: string, userId: string): Promise<string> {
    const [ivHex, encryptedData] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const userSecret = this.generateUserSecret(userId);

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(userSecret.slice(0, 32)),
      iv
    );

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
} 