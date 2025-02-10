import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deposit } from '../entities/deposit.entity';
import { WalletBalance } from '../entities/wallet-balance.entity';
import { Token } from '../entities/token.entity';
import { Wallet } from '../entities/wallet.entity';
import { SystemSettings } from '../entities/system-settings.entity';
import { 
  providers,
  Contract,
  utils,
  Wallet as ethersWallet,
  ethers // Add this
} from 'ethers';
import { WebSocketProvider, JsonRpcProvider } from '@ethersproject/providers';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from 'decimal.js';
import { In, Not, IsNull, ILike } from 'typeorm';
import * as bitcoin from 'bitcoinjs-lib';
const TronWeb = require('tronweb');
type TronWebType = typeof TronWeb;
type TronWebInstance = InstanceType<TronWebType>;
import { Client } from 'xrpl';
type XrplClient = Client;
import * as fs from 'fs';
import * as path from 'path';
import { EmailService } from '../../email/email.service';
import { User } from '../../auth/entities/user.entity';  // Fixed import path
import { AdminWallet } from '../entities/admin-wallet.entity';
import { WalletKey } from '../entities/wallet-key.entity';
import { KeyManagementService } from '../key-management.service';
import { SweepTransaction } from '../entities/sweep-transaction.entity';
import { GasTankWallet } from '../entities/gas-tank-wallet.entity';

// ERC20 ABI for token transfers
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

// Add these interfaces at the top of the file
interface BitcoinProvider {
  url: string;
  auth: {
    username: string;
    password: string;
  };
}

interface Providers {
  [key: string]: JsonRpcProvider | WebSocketProvider | BitcoinProvider | TronWebInstance | XrplClient;
}

// Add this interface at the top with other interfaces
interface BitcoinBlock {
  tx: Array<any>;
  height: number;
  hash: string;
  // Add other relevant fields
}

// Add this at the top with other interfaces
export const SUPPORTED_CHAINS = {
  eth: true,
  bsc: true,
  btc: true,
  trx: true,
  xrp: true
};

@Injectable()
export class DepositTrackingService implements OnModuleInit {
  private readonly logger = new Logger(DepositTrackingService.name);
  private readonly providers = new Map<string, Providers[string]>();
  private readonly CONFIRMATION_BLOCKS = {
    eth: {
      mainnet: 12,
      testnet: 1
    },
    bsc: {
      mainnet: 15,
      testnet: 2
    },
    btc: {
      mainnet: 3,
      testnet: 2
    },
    trx: {
      mainnet: 20,
      testnet: 10
    },
    xrp: {
      mainnet: 4,
      testnet: 2
    }
  } as const;

  private readonly PROCESSING_DELAYS = {
    eth: {
      blockDelay: this.configService.get('ETHEREUM_BLOCK_DELAY', 1000),
      checkInterval: this.configService.get('ETHEREUM_CHECK_INTERVAL', 3000)
    },
    bsc: {
      blockDelay: this.configService.get('BSC_BLOCK_DELAY', 1000),
      checkInterval: this.configService.get('BSC_CHECK_INTERVAL', 3000)
    },
    bitcoin: {
      blockDelay: this.configService.get('BITCOIN_BLOCK_DELAY', 1000),
      checkInterval: this.configService.get('BITCOIN_CHECK_INTERVAL', 3000)
    },
    trx: {
      blockDelay: this.configService.get('TRON_BLOCK_DELAY', 1000),
      checkInterval: this.configService.get('TRON_CHECK_INTERVAL', 3000)
    },
    xrp: {
      blockDelay: this.configService.get('XRP_BLOCK_DELAY', 1000),
      checkInterval: this.configService.get('XRP_CHECK_INTERVAL', 3000)
    }
  };

  private readonly CHAIN_KEYS = {
    eth: 'ethereum',      // Changed from 'eth' to 'ethereum' to match database
    bsc: 'bsc',
    bitcoin: 'btc',
    trx: 'trx',
    xrp: 'xrp'
  } as const;

  private blockQueues: {
    [key: string]: {
        queue: number[];
        processing: boolean;
        lastQueuedBlock?: number;
    };
  } = {};

  private processingLocks: Map<string, boolean> = new Map();

  private monitoringActive = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private shouldStop = false;

  // Add interval properties
  private ethMainnetInterval: NodeJS.Timeout | null = null;
  private ethTestnetInterval: NodeJS.Timeout | null = null;
  private bscMainnetInterval: NodeJS.Timeout | null = null;
  private bscTestnetInterval: NodeJS.Timeout | null = null;
  private btcMainnetInterval: NodeJS.Timeout | null = null;
  private btcTestnetInterval: NodeJS.Timeout | null = null;
  private tronMainnetInterval: NodeJS.Timeout | null = null;
  private tronTestnetInterval: NodeJS.Timeout | null = null;
  private xrpMainnetInterval: NodeJS.Timeout | null = null;
  private xrpTestnetInterval: NodeJS.Timeout | null = null;

  // Add processing flag properties
  private isProcessingEthMainnet = false;
  private isProcessingEthTestnet = false;
  private isProcessingBscMainnet = false;
  private isProcessingBscTestnet = false;
  private isProcessingBtcMainnet = false;
  private isProcessingBtcTestnet = false;
  private isProcessingTronMainnet = false;
  private isProcessingTronTestnet = false;
  private isProcessingXrpMainnet = false;
  private isProcessingXrpTestnet = false;

  private evmBlockListeners = new Map<string, any>();

  // Add chain monitoring status tracking
  private chainMonitoringStatus: Record<string, Record<string, boolean>> = {};

  private currentBlocks: Record<string, number> = {};
  private savedBlocks: Record<string, string> = {};
  private lastProcessedBlocks: Record<string, string> = {};

  private monitoringProviders: { [key: string]: any } = {};
  private infoProviders: { [key: string]: any } = {};

  // Add at the top with other private properties
  private isMonitoring: { [key: string]: boolean } = {};

  private bitcoinIntervals: { [key: string]: NodeJS.Timeout | null } = {};
  private logStream: fs.WriteStream;

  // Add ERC20 ABI as a class property
  private readonly ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 value) returns (bool)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function transferFrom(address from, address to, uint256 value) returns (bool)",
    "function decimals() view returns (uint8)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
  ];

  // Add to class properties
  private readonly MINIMUM_NATIVE_BALANCE = {
      ethereum: this.configService.get('ETH_MINIMUM_BALANCE', '0.005'),  // 0.005 ETH
      bsc: this.configService.get('BNB_MINIMUM_BALANCE', '0.01'),      // 0.01 BNB
  };

  constructor(
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    @InjectRepository(WalletBalance)
    private walletBalanceRepository: Repository<WalletBalance>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private configService: ConfigService,
    @InjectRepository(SystemSettings)
    private systemSettingsRepository: Repository<SystemSettings>,
    private readonly emailService: EmailService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AdminWallet)
    private adminWalletRepository: Repository<AdminWallet>,
    @InjectRepository(WalletKey)
    private walletKeyRepository: Repository<WalletKey>,
    private keyManagementService: KeyManagementService,
    @InjectRepository(SweepTransaction)
    private sweepTransactionRepository: Repository<SweepTransaction>,
    @InjectRepository(GasTankWallet)
    private gasTankWalletRepository: Repository<GasTankWallet>,
  ) {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    // Create or append to log file
    this.logStream = fs.createWriteStream(
      path.join(logsDir, `deposit-tracking-${new Date().toISOString().split('T')[0]}.log`),
      { flags: 'a' }
    );
  }

  private logToFile(message: string) {
    const timestamp = new Date().toISOString();
    this.logStream.write(`[${timestamp}] ${message}\n`);
  }

  async onModuleInit() {
    ['eth_mainnet', 'eth_testnet', 'bsc_mainnet', 'bsc_testnet'].forEach(chain => {
        this.blockQueues[chain] = {
            queue: [],
            processing: false  // Add the processing property here
        };
    });
    
    await this.initializeProviders();
    // Remove automatic start of monitoring
    // await this.startMonitoring();
  }

  private async initializeProviders() {
    const chains = ['eth', 'bsc', 'btc', 'trx', 'xrp'];
    const networks = ['mainnet', 'testnet'];

    for (const chain of chains) {
      for (const network of networks) {
        const key = `${chain}_${network}`;
        try {
          // Try to initialize both providers
          const mainProvider = await this.createProviderWithFallback(chain, network);
          const infoProvider = await this.createProviderWithFallback(chain, network);

          // Only set providers if both initialize successfully
          this.providers.set(key, mainProvider);
          this.infoProviders[key] = infoProvider;

          const blockNumber = await mainProvider.getBlockNumber?.() || 
                            await this.getCurrentBlockHeight(chain, network, mainProvider);
          this.logger.log(`${chain.toUpperCase()} ${network} providers initialized successfully, current block: ${blockNumber}`);

        } catch (error) {
          // Log error and skip this chain/network combination
          this.logger.error(`Failed to initialize providers for ${chain}_${network}:`, error);
          // Clean up any partially initialized providers
          this.providers.delete(key);
          delete this.infoProviders[key];
          continue;
        }
      }
    }
  }

  async startMonitoring(chain?: string, network?: string) {
    if (chain && network) {
      // Start monitoring for specific chain/network
      const key = `${chain}_${network}`;
      this.isMonitoring[key] = true;
      this.chainMonitoringStatus[chain] = {
        ...this.chainMonitoringStatus[chain],
        [network]: true
      };
      
      this.processBlocks(chain, network).catch(error => {
        this.logger.error(`Error in monitoring process for ${chain} ${network}:`, error);
        this.isMonitoring[key] = false;
        this.chainMonitoringStatus[chain][network] = false;
      });

      this.logger.log(`Started monitoring ${chain} ${network}`);
    } else {
      // Start monitoring all chains
      const chains = ['eth', 'bsc', 'btc', 'trx', 'xrp'];
      const networks = ['mainnet', 'testnet'];

      for (const c of chains) {
        this.chainMonitoringStatus[c] = {};
        for (const n of networks) {
          await this.startMonitoring(c, n);
        }
      }
    }
  }

  async stopMonitoring(chain?: string, network?: string) {
    if (chain && network) {
      // Stop monitoring for specific chain/network
      const key = `${chain}_${network}`;
      this.isMonitoring[key] = false;
      this.chainMonitoringStatus[chain] = {
        ...this.chainMonitoringStatus[chain],
        [network]: false
      };
      this.logger.log(`Stopped monitoring ${chain} ${network}`);
    } else {
      // Stop monitoring all chains
      const chains = ['eth', 'bsc', 'btc', 'trx', 'xrp'];
      const networks = ['mainnet', 'testnet'];

      for (const c of chains) {
        for (const n of networks) {
          await this.stopMonitoring(c, n);
        }
      }
    }
  }

  // Add method to get chain status
  public getChainStatus(): Record<string, Record<string, boolean>> {
    return { ...this.chainMonitoringStatus };
  }

  // Helper method to clear intervals
  private clearChainIntervals(chain: string, network: string) {
    switch (chain) {
      case 'eth':
        if (network === 'mainnet' && this.ethMainnetInterval) {
          clearInterval(this.ethMainnetInterval);
          this.ethMainnetInterval = null;
        } else if (network === 'testnet' && this.ethTestnetInterval) {
          clearInterval(this.ethTestnetInterval);
          this.ethTestnetInterval = null;
        }
        break;
      case 'bsc':
        if (network === 'mainnet' && this.bscMainnetInterval) {
          clearInterval(this.bscMainnetInterval);
          this.bscMainnetInterval = null;
        } else if (network === 'testnet' && this.bscTestnetInterval) {
          clearInterval(this.bscTestnetInterval);
          this.bscTestnetInterval = null;
        }
        break;
      case 'btc':
        if (network === 'mainnet' && this.btcMainnetInterval) {
          clearInterval(this.btcMainnetInterval);
          this.btcMainnetInterval = null;
        } else if (network === 'testnet' && this.btcTestnetInterval) {
          clearInterval(this.btcTestnetInterval);
          this.btcTestnetInterval = null;
        }
        break;
      case 'trx':
        if (network === 'mainnet' && this.tronMainnetInterval) {
          clearInterval(this.tronMainnetInterval);
          this.tronMainnetInterval = null;
        } else if (network === 'testnet' && this.tronTestnetInterval) {
          clearInterval(this.tronTestnetInterval);
          this.tronTestnetInterval = null;
        }
        break;
      case 'xrp':
        if (network === 'mainnet' && this.xrpMainnetInterval) {
          clearInterval(this.xrpMainnetInterval);
          this.xrpMainnetInterval = null;
        } else if (network === 'testnet' && this.xrpTestnetInterval) {
          clearInterval(this.xrpTestnetInterval);
          this.xrpTestnetInterval = null;
        }
        break;
    }
  }

  private async checkForNewDeposits() {
    try {
      // Your deposit checking logic here
      // This will run every interval to check for new deposits
      const chains = ['eth', 'bsc', 'btc', 'trx', 'xrp'];
      const networks = ['mainnet', 'testnet'];

      for (const chain of chains) {
        for (const network of networks) {
          await this.processChainDeposits(chain, network);
        }
      }
    } catch (error) {
      console.error('Error checking for deposits:', error);
    }
  }

  private async processChainDeposits(chain: string, network: string) {
    try {
      const currentBlock = await this.getCurrentBlockHeight(chain, network);
      const startBlock = await this.getStartBlock(chain, network);

      if (!startBlock) {
        console.log(`No start block configured for ${chain} ${network}`);
        return;
      }

      // Process blocks from startBlock to currentBlock
      // Implement your deposit processing logic here
    } catch (error) {
      console.error(`Error processing deposits for ${chain} ${network}:`, error);
    }
  }

  private async getStartBlock(chain: string, network: string): Promise<number | null> {
    const key = `start_block_${chain}_${network}`;
    const setting = await this.systemSettingsRepository.findOne({
      where: { key }
    });
    return setting ? parseInt(setting.value) : null;
  }

  private monitorXrpChains() {
    if (!this.monitoringActive) return;

    const mainnetInterval = setInterval(() => {
      this.checkXrpBlocks('mainnet');
    }, this.PROCESSING_DELAYS.xrp.checkInterval);

    const testnetInterval = setInterval(() => {
      this.checkXrpBlocks('testnet');
    }, this.PROCESSING_DELAYS.xrp.checkInterval);

    this.xrpMainnetInterval = mainnetInterval;
    this.xrpTestnetInterval = testnetInterval;
  }

  private async monitorEvmChain(chain: string, network: string, startBlock?: number) {
    const provider = this.providers.get(`${chain}_${network}`) as providers.Provider;
    if (!provider) return;

    this.logger.log(`Started monitoring ${chain.toUpperCase()} ${network} blocks from block ${startBlock}`);

    // Initialize block queue if not exists
    const queueKey = `${chain}_${network}`;
    if (!this.blockQueues[queueKey]) {
        this.blockQueues[queueKey] = {
            queue: [],
            processing: false,
            lastQueuedBlock: startBlock - 1  // Initialize last queued block
        };
    }

    // Initialize queue with the starting block
    if (startBlock) {
        this.blockQueues[queueKey].queue = [startBlock];
        this.blockQueues[queueKey].lastQueuedBlock = startBlock - 1;  // Reset last queued block
        await this.updateLastProcessedBlock(chain, network, startBlock - 1);
    }

    // Start interval to check new blocks
    setInterval(async () => {
        try {
            if (!this.chainMonitoringStatus[chain][network]) return;

            const currentBlock = await provider.getBlockNumber();
            const lastQueuedBlock = this.blockQueues[queueKey].lastQueuedBlock;

            // Add all blocks sequentially
            for (let i = lastQueuedBlock + 1; i <= currentBlock; i++) {
                if (!this.blockQueues[queueKey].queue.includes(i)) {
                    this.logToFile(`Adding block ${i} to queue for ${chain} ${network}`);
                    this.blockQueues[queueKey].queue.push(i);
                }
            }
            
            // Update last queued block only after successfully adding blocks
            this.blockQueues[queueKey].lastQueuedBlock = currentBlock;

            // Start processing queue if not already processing
            if (!this.blockQueues[queueKey].processing) {
                await this.processQueueForChain(chain, network, provider);
            }

        } catch (error) {
            this.logger.error(`Error monitoring ${chain} ${network} blocks:`, error);
        }
    }, this.PROCESSING_DELAYS[chain].checkInterval);
}

  private async processQueueForChain(chain: string, network: string, provider: any) {
    const queueKey = `${chain}_${network}`;
    const queue = this.blockQueues[queueKey];
    queue.processing = true;

    try {
        while (queue.queue.length > 0) {
            // Check monitoring status inside the loop
            if (!this.chainMonitoringStatus[chain][network]) {
                break;
            }

            // Always process the first block in queue (FIFO)
            const blockNumber = queue.queue[0];
            try {
                this.logger.log(`${chain.toUpperCase()} ${network}: Processing block ${blockNumber}`);
                await this.processEvmBlock(chain, network, blockNumber, provider);
                
                // Only remove block from queue after successful processing
                queue.queue.shift();
                
                // Add delay between blocks
                await new Promise(resolve => setTimeout(resolve, this.PROCESSING_DELAYS[chain].blockDelay));
            } catch (error) {
                this.logger.error(`Error processing ${chain} ${network} block ${blockNumber}: ${error.message}`);
                // On error, remove block and continue
                queue.queue.shift();
            }
        }
    } finally {
        queue.processing = false;
        // If still have blocks and monitoring, start processing again
        if (queue.queue.length > 0 && this.chainMonitoringStatus[chain][network]) {
            setImmediate(() => this.processQueueForChain(chain, network, provider));
        }
    }
}

  private async processEvmBlock(chain: string, network: string, blockNumber: number, provider: providers.Provider) {
    try {
        // Get block with transactions
        const block = await provider.getBlock(blockNumber);
        if (!block) {
            this.logToFile(`${chain} ${network}: Block ${blockNumber} not found`);
            return;
        }

        // Get transaction details with full info
        const txPromises = block.transactions.map(txHash => 
            provider.getTransaction(txHash)
        );
        
        const transactions = await Promise.all(txPromises);
        this.logger.log(`${chain.toUpperCase()} ${network}: Processing block ${blockNumber} with ${transactions.length} transactions`);

        // Get all wallet addresses for this chain/network
        const chainKey = this.CHAIN_KEYS[chain] || chain;
        this.logToFile(`Looking up wallets with blockchain: ${chainKey}, network: ${network}`);
        
        const wallets = await this.walletRepository.find({
            where: { 
                blockchain: chainKey,
                network: network
            }
        });

        // Debug logging
        this.logToFile(`Found ${wallets.length} wallets for ${chain} ${network}`);
        wallets.forEach(wallet => {
            this.logToFile(`Wallet found: blockchain=${wallet.blockchain}, network=${wallet.network}, address=${wallet.address}`);
        });

        const walletAddresses = new Set(wallets.map(w => w.address.toLowerCase()));
        this.logToFile(`Checking ${walletAddresses.size} wallet addresses for ${chain} ${network}`);
        this.logToFile(`Our wallet addresses: ${Array.from(walletAddresses).join(', ')}`);

        // Process each transaction
        for (const tx of transactions) {
            if (tx) {
                try {
                    this.logToFile(`Processing transaction: ${tx.hash}`);
                    this.logToFile(`Transaction to: ${tx.to?.toLowerCase()}`);
                    
                    // Remove the wallet address check here - let processEvmTransaction handle it
                        await this.processEvmTransaction(chain, network, tx);
                    
                } catch (error) {
                    this.logToFile(`Error processing transaction ${tx.hash}: ${error.message}`);
                    continue;
                }
            }
        }

        await this.updateEvmConfirmations(chain, network, blockNumber);

    } catch (error) {
        this.logger.error(`Error processing ${chain} ${network} block ${blockNumber}:`, error);
        throw error;
    }
}

  // Add these new private methods first
  private async sweepEvmDeposit(deposit: Deposit, confirmations: number): Promise<{success: boolean, txHash?: string}> {
    try {
        this.logToFile(`[sweepEvmDeposit] Starting sweep for deposit ${deposit.id}, hash: ${deposit.txHash}`);
        this.logToFile(`[sweepEvmDeposit] Deposit blockchain: ${deposit.blockchain}, network: ${deposit.network}`);

        // Check if already swept
        const existingSweep = await this.sweepTransactionRepository.findOne({
            where: { depositId: deposit.id }
        });

        if (existingSweep) {
            this.logToFile(`[sweepEvmDeposit] Deposit ${deposit.id} already swept in transaction ${existingSweep.txHash}`);
            return { success: true };
        }

        const wallet = await this.walletRepository.findOne({
            where: { id: deposit.walletId }
        });

        if (!wallet) {
            this.logToFile(`[sweepEvmDeposit] Wallet not found for deposit ${deposit.id}`);
            return { success: false };
        }

        const adminWallet = await this.adminWalletRepository.findOne({
            where: {
                blockchain: deposit.blockchain,
                network: deposit.network,
                isActive: true
            }
        });

        if (!adminWallet) {
            this.logToFile(`[sweepEvmDeposit] No active admin wallet found for ${deposit.blockchain} ${deposit.network}`);
            return { success: false };
        }

        this.logToFile(`[sweepEvmDeposit] Found admin wallet ${adminWallet.address} for deposit ${deposit.id}`);

        // Create sweep transaction record
        const sweepTx = await this.sweepTransactionRepository.save({
            depositId: deposit.id,
            fromWalletId: wallet.id,
            toAdminWalletId: adminWallet.id,
            amount: deposit.amount,
            status: 'pending',
            txHash: 'pending', // Add placeholder
            metadata: {
                blockchain: deposit.blockchain,
                network: deposit.network,
                tokenId: deposit.tokenId
            } as Record<string, any>
        });

        this.logToFile(`[sweepEvmDeposit] Created sweep transaction record ${sweepTx.id}`);

        const walletKey = await this.walletKeyRepository.findOne({
            where: { id: wallet.keyId }
        });

        if (!walletKey) {
            this.logToFile(`[sweepEvmDeposit] Wallet key not found for wallet ${wallet.id}`);
            return { success: false };
        }

        const privateKey = await this.keyManagementService.decryptPrivateKey(
            walletKey.encryptedPrivateKey,
            walletKey.userId
        );

        if (!privateKey) {
            this.logToFile(`[sweepEvmDeposit] Failed to decrypt private key for wallet ${wallet.id}`);
            return { success: false };
        }

        this.logToFile(`[sweepEvmDeposit] Successfully decrypted private key`);
        
        try {
            this.logToFile(`[sweepEvmDeposit] Attempting to get provider for ${deposit.blockchain} ${deposit.network}`);
            const provider = this.getEvmProvider(deposit.blockchain, deposit.network);
            this.logToFile(`[sweepEvmDeposit] Successfully got provider`);
            
            const signer = new ethersWallet(privateKey, provider);
            this.logToFile(`[sweepEvmDeposit] Created signer for address ${signer.address}`);

            let success = false;
            let sweepResult: { 
                success: boolean; 
                txHash?: string; 
                skipped?: boolean;
                errorMessage?: string;  // Added errorMessage to type
            };  // Declare the type

            try {
                if (deposit.tokenId) {
                    // Get token details first
                    const token = await this.tokenRepository.findOne({
                        where: { id: deposit.tokenId }
                    });
                    
                    this.logToFile(`[sweepEvmDeposit] Token details for ${deposit.tokenId}: ${JSON.stringify(token)}`);
                    
                    if (token?.contractAddress) {
                        sweepResult = await this.sweepEvmToken(deposit, signer, adminWallet.address, provider);
                    } else {
                        // If no contract address, treat as native token
                        this.logToFile(`[sweepEvmDeposit] No contract address found for token ${deposit.tokenId}, treating as native token`);
                        sweepResult = await this.sweepEvmNative(deposit, signer, adminWallet.address, provider);
                    }
                } else {
                    sweepResult = await this.sweepEvmNative(deposit, signer, adminWallet.address, provider);
                }

                if (sweepResult.success) {
                    if (sweepResult.skipped) {
                        let symbol: string;
                        if (deposit.tokenId) {
                            const token = await this.tokenRepository.findOne({
                                where: { id: deposit.tokenId }
                            });
                            symbol = token?.symbol || 'UNKNOWN';
                        } else {
                            symbol = deposit.blockchain === 'ethereum' ? 'ETH' : 'BNB';
                        }

                        await this.sweepTransactionRepository.update(sweepTx.id, {
                            status: 'skipped',
                            message: `Kept minimum balance of ${this.MINIMUM_NATIVE_BALANCE[deposit.blockchain]} ${symbol} for gas`  // Changed from notes to message
                        });
                    } else {
                        await this.sweepTransactionRepository.update(sweepTx.id, {
                            status: 'completed',
                            txHash: sweepResult.txHash,
                            message: 'Successfully swept funds to admin wallet'
                        });
                    }
                    success = true;
                } else {
                    await this.sweepTransactionRepository.update(sweepTx.id, {
                        status: 'failed',
                        message: sweepResult.errorMessage || 'Unknown error occurred'
                    });
                }
            } catch (error) {
                await this.sweepTransactionRepository.update(sweepTx.id, {
                    status: 'failed',
                    metadata: {
                        ...sweepTx.metadata,
                        error: error.message
                    } as Record<string, any>
                });
                success = false;
            }

            this.logToFile(`[sweepEvmDeposit] Sweep ${success ? 'successful' : 'failed'} for deposit ${deposit.id}`);
            return { success, txHash: sweepResult.txHash };
        } catch (error) {
            this.logToFile(`[sweepEvmDeposit] Error during provider/signer setup: ${error.message}`);
            throw error;
        }
    } catch (error) {
        this.logToFile(`[sweepEvmDeposit] Error: ${error.message}`);
        return { success: false };
    }
}

  private async sweepEvmToken(
    deposit: Deposit,
    signer: ethersWallet,
    adminAddress: string,
    provider: providers.Provider
  ): Promise<{success: boolean, txHash?: string, errorMessage?: string}> {  // Added errorMessage
    try {
        this.logToFile(`[sweepEvmToken] Starting token sweep for deposit ${deposit.id}`);

        const token = await this.tokenRepository.findOne({
            where: { id: deposit.tokenId }
        });

        if (!token?.contractAddress) {
            this.logToFile(`[sweepEvmToken] Token contract address not found for deposit ${deposit.id}`);
            return {success: false};
        }

        this.logToFile(`[sweepEvmToken] Using contract at ${token.contractAddress}`);
        
        // Create contract instance with the deposit wallet signer
        const contract = new Contract(token.contractAddress, this.ERC20_ABI, signer);
        
        // Get token balance
        const balance = await contract.balanceOf(signer.address);
        const decimals = await contract.decimals();
        this.logToFile(`[sweepEvmToken] Token balance: ${balance.toString()}, decimals: ${decimals}`);

        if (balance.isZero()) {
            this.logToFile(`[sweepEvmToken] No token balance to sweep`);
            return {success: false};
        }

        // Format balance with proper decimals
        const formattedBalance = ethers.utils.formatUnits(balance, decimals);
        this.logToFile(`[sweepEvmToken] Formatted balance: ${formattedBalance}`);

        // Update sweep transaction with formatted balance
        await this.sweepTransactionRepository.update(
            { depositId: deposit.id },
            { amount: formattedBalance }
        );

        // Get gas price
        const gasPrice = await provider.getGasPrice();
        this.logToFile(`[sweepEvmToken] Gas price: ${gasPrice.toString()}`);

        // Estimate gas for the transfer
        const gasEstimate = await contract.estimateGas.transfer(adminAddress, balance);
        this.logToFile(`[sweepEvmToken] Estimated gas: ${gasEstimate.toString()}`);

        // Add 20% buffer to gas limit
        const gasLimit = gasEstimate.mul(12).div(10);

        this.logToFile(`[sweepEvmToken] Sending ${formattedBalance} tokens to ${adminAddress}`);

        // Simple transfer from deposit wallet to admin wallet
        const tx = await contract.transfer(adminAddress, balance, {
            gasLimit,
            gasPrice
        });

        this.logToFile(`[sweepEvmToken] Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        this.logToFile(`[sweepEvmToken] Transaction confirmed: ${tx.hash}`);

        return {success: true, txHash: tx.hash};
    } catch (error) {
        this.logToFile(`[sweepEvmToken] Error: ${error.message}`);
        this.logToFile(`[sweepEvmToken] Error details: ${JSON.stringify(error)}`);
        return {success: false, errorMessage: error.message};  // Return error message
    }
}

  private async sweepEvmNative(
    deposit: Deposit,
    signer: ethersWallet,
    adminAddress: string,
    provider: providers.Provider
  ): Promise<{success: boolean, txHash?: string, skipped?: boolean, errorMessage?: string}> {  // Added skipped flag and errorMessage
    try {
        this.logToFile(`[sweepEvmNative] Starting native token sweep for deposit ${deposit.id}`);

        const balance = await provider.getBalance(signer.address);
        this.logToFile(`[sweepEvmNative] Wallet balance: ${ethers.utils.formatEther(balance)}`);

        const minBalance = ethers.utils.parseEther(
            this.MINIMUM_NATIVE_BALANCE[deposit.blockchain] || '0.01'
        );
        
        if (balance.lte(minBalance)) {
            this.logToFile(`[sweepEvmNative] Balance ${ethers.utils.formatEther(balance)} is less than or equal to minimum ${ethers.utils.formatEther(minBalance)}. Skipping sweep.`);
            return { success: true, skipped: true };  // Changed to success: true with skipped flag
        }

        // Calculate amount to sweep (balance - minimum)
        const amountToSweep = balance.sub(minBalance);
        this.logToFile(`[sweepEvmNative] Sweeping ${ethers.utils.formatEther(amountToSweep)}, leaving ${ethers.utils.formatEther(minBalance)}`);

        // Update sweep transaction with actual amount before transfer
        await this.sweepTransactionRepository.update(
            { depositId: deposit.id },
            { amount: ethers.utils.formatEther(amountToSweep) }
        );

        // Get gas price
        const gasPrice = await provider.getGasPrice();
        const gasLimit = 21000; // Standard ETH transfer
        const gasCost = gasPrice.mul(gasLimit);

        // Make sure we're not leaving less than minimum after gas
        if (amountToSweep.sub(gasCost).lte(0)) {
            this.logToFile(`[sweepEvmNative] Amount after gas would be too low. Skipping sweep.`);
            return { success: false };
        }

        // Send transaction
        const tx = await signer.sendTransaction({
            to: adminAddress,
            value: amountToSweep,
            gasPrice,
            gasLimit
        });

        this.logToFile(`[sweepEvmNative] Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        this.logToFile(`[sweepEvmNative] Transaction confirmed: ${tx.hash}`);

        return { success: true, txHash: tx.hash };
    } catch (error) {
        this.logToFile(`[sweepEvmNative] Error: ${error.message}`);
        this.logToFile(`[sweepEvmNative] Error details: ${JSON.stringify(error)}`);
        return { success: false, errorMessage: error.message };
    }
}


  // Then modify the existing updateEvmConfirmations method
  private async updateEvmConfirmations(chain: string, network: string, currentBlock: number) {
    try {
        this.logToFile(`[updateEvmConfirmations] Starting for ${chain} ${network}, current block ${currentBlock}`);

        const chainKey = this.CHAIN_KEYS[chain] || chain;
        this.logToFile(`[updateEvmConfirmations] Using chainKey: ${chainKey}`);

        const deposits = await this.depositRepository.find({
            where: {
                blockchain: chainKey,
                network: network,
                status: In(['pending', 'confirming']),
                blockNumber: Not(IsNull()),
            },
        });

        this.logToFile(`[updateEvmConfirmations] Found ${deposits.length} deposits to process: ${JSON.stringify(deposits.map(d => ({
            id: d.id,
            status: d.status,
            amount: d.amount,
            blockNumber: d.blockNumber
        })))}`);
        
        for (const deposit of deposits) {
            this.logToFile(`[updateEvmConfirmations] Processing deposit: ${JSON.stringify({
                id: deposit.id,
                blockNumber: deposit.blockNumber,
                status: deposit.status,
                currentBlock: currentBlock
            })}`);

            const oldStatus = deposit.status;
            const confirmations = currentBlock - deposit.blockNumber;
            const requiredConfirmations = this.CONFIRMATION_BLOCKS[chain][network];

            this.logToFile(`[updateEvmConfirmations] Deposit ${deposit.id}: currentBlock ${currentBlock}, depositBlock ${deposit.blockNumber}, confirmations ${confirmations}, required ${requiredConfirmations}`);

            await this.depositRepository.update(deposit.id, {
                confirmations,
                status: confirmations >= requiredConfirmations ? 'confirmed' : 'confirming'
            });

            this.logToFile(`[updateEvmConfirmations] Updated deposit ${deposit.id} with confirmations ${confirmations} and status ${confirmations >= requiredConfirmations ? 'confirmed' : 'confirming'}`);

            if (oldStatus !== 'confirmed' && confirmations >= requiredConfirmations) {
                this.logToFile(`[updateEvmConfirmations] Deposit ${deposit.id} just confirmed, initiating sweep`);
                
                const wallet = await this.walletRepository.findOne({
                    where: { id: deposit.walletId }
                });
                
                if (wallet) {
                    const user = await this.userRepository.findOne({
                        where: { id: wallet.userId }
                    });

                    // Get token details for the correct symbol
                    const token = await this.tokenRepository.findOne({
                        where: { id: deposit.tokenId }
                    });

                    if (user?.email && user.notificationSettings?.Wallet?.Deposits) {
                        await this.emailService.sendDepositConfirmedEmail(
                            user.email,
                            user.fullName,
                            this.formatAmount(deposit.amount),
                            token?.symbol || chain.toUpperCase()
                        );
                        this.logToFile(`[updateEvmConfirmations] Sent confirmation email for deposit ${deposit.id} with token ${token?.symbol}`);
                    }
                }

                await this.updateWalletBalance(deposit);
                this.logToFile(`[updateEvmConfirmations] Updated wallet balance for deposit ${deposit.id}`);

                try {
                    this.logToFile(`[updateEvmConfirmations] Starting sweep for deposit ${deposit.id}`);
                    await this.sweepEvmDeposit(deposit, confirmations);
                    this.logToFile(`[updateEvmConfirmations] Sweep completed for deposit ${deposit.id}`);
                } catch (error) {
                    this.logToFile(`[updateEvmConfirmations] Sweep failed for deposit ${deposit.id}: ${error.message}`);
                }
            }
        }
    } catch (error) {
        this.logToFile(`[updateEvmConfirmations] Error: ${error.message}`);
        this.logger.error(`Error updating ${chain} confirmations: ${error.message}`);
    }
}

  private async processEvmTransaction(chain: string, network: string, tx: providers.TransactionResponse) {
    try {
        this.logToFile(`[START] Processing EVM transaction ${tx.hash}`);
        
        // Validate transaction hash format
        if (!tx.hash || tx.hash.length !== 66 || !tx.hash.startsWith('0x')) {
            this.logToFile(`[ERROR] Invalid transaction hash format: ${tx.hash}`);
            return;
        }

        // Get transaction receipt with retry logic
        let receipt;
        try {
            receipt = await tx.wait();
        } catch (error) {
            // Log the specific error
            this.logToFile(`[ERROR] Failed to get receipt for tx ${tx.hash}: ${error.message}`);
            
            // Try to get receipt directly from provider
            const provider = this.providers.get(`${chain}_${network}`);
            if (!provider) {
                this.logToFile(`[ERROR] No provider found for ${chain}_${network}`);
                return;
            }

            try {
                receipt = await provider.getTransactionReceipt(tx.hash);
                if (!receipt) {
                    this.logToFile(`[SKIP] No receipt found for transaction ${tx.hash}`);
                    return;
                }
            } catch (retryError) {
                this.logToFile(`[ERROR] Failed to get receipt on retry: ${retryError.message}`);
                return;
            }
        }

        // Add debug logs for receipt
        this.logToFile(`[DEBUG] Transaction ${tx.hash} receipt:`);
        this.logToFile(`[DEBUG] Receipt status: ${receipt.status}`);
        this.logToFile(`[DEBUG] Receipt logs count: ${receipt.logs.length}`);
        
        // Check if transaction was successful
        if (receipt.status === 0) {
            this.logToFile(`[SKIP] Transaction ${tx.hash} failed on-chain`);
            return;
        }

        // Rest of the existing code remains exactly the same...
        this.logToFile(`[RECEIPT] Got receipt for ${tx.hash}`);

        // Get all user wallets for this chain/network
        const chainKey = this.CHAIN_KEYS[chain] || chain;
        const wallets = await this.walletRepository.find({
            where: {
                blockchain: chainKey,
                network: network,
            },
        });

        // Create a map of addresses to wallet IDs for quick lookup
        const walletMap = new Map(wallets.map(w => [w.address.toLowerCase(), w]));
        this.logToFile(`[WALLETS] Found ${wallets.length} wallets to check`);
        
        // Get token for this transaction first
        this.logToFile(`[TOKEN] Getting token for transaction ${tx.hash}`);
        const token = await this.getTokenForTransaction(chain, tx);
        this.logToFile(`[TOKEN] Token result: ${JSON.stringify(token)}`);
        
        if (!token) {
            this.logToFile(`[SKIP] No token found for transaction ${tx.hash}`);
            return;
        }

        // Add debug log for token contract address
        if (token.contractAddress) {
            this.logToFile(`[DEBUG] Token contract address: ${token.contractAddress.toLowerCase()}`);
        }

        // For native token transfers, check tx.to
        if (token.networkVersion === 'NATIVE') {
            const toAddress = tx.to?.toLowerCase();
            if (!toAddress || !walletMap.has(toAddress)) {
                this.logToFile(`[SKIP] Native transaction ${tx.hash} not to our wallets`);
                return;
            }
            this.logToFile(`[WALLET] Found wallet for native transfer to ${toAddress}`);

            // Check if deposit exists
            const existingDeposit = await this.depositRepository.findOne({
                where: {
                    txHash: tx.hash,
                    blockchain: chainKey,
                    network: network
                }
            });

            if (existingDeposit) {
                this.logToFile(`[SKIP] Deposit already exists for transaction ${tx.hash}`);
                return;
            }

            // Create deposit for native transfer
            const wallet = walletMap.get(toAddress);
            const nativeAmount = utils.formatEther(tx.value);
            const deposit = this.depositRepository.create({
                userId: wallet.userId,
                walletId: wallet.id,
                tokenId: token.id,
                txHash: tx.hash,
                amount: nativeAmount,
                blockchain: chainKey,
                network: network,
                networkVersion: token.networkVersion,
                blockNumber: receipt.blockNumber,
                confirmations: 0,
                status: 'pending',
                metadata: {
                    from: tx.from,
                    blockHash: receipt.blockHash,
                    fee: utils.formatEther(tx.gasPrice.mul(receipt.gasUsed))
                }
            });

            await this.depositRepository.save(deposit);
            this.logToFile(`[DEPOSIT] Created native deposit record: ${JSON.stringify(deposit)}`);

            const user = await this.userRepository.findOne({
                where: { id: wallet.userId }
            });

            if (user?.email && user.notificationSettings?.Wallet?.Deposits) {
                await this.emailService.sendDepositCreatedEmail(
                    user.email,
                    user.fullName,
                    nativeAmount,
                    token.symbol || chain.toUpperCase()  // Use token symbol
                );
            }

            return;
        }

        // Get amount and check recipient for token transfers
        this.logToFile(`[AMOUNT] Getting amount for transaction ${tx.hash}`);
        const amount = await this.getTransactionAmount(tx, token);
        this.logToFile(`[AMOUNT] Amount result: ${amount}`);
        
        if (!amount) {
            this.logToFile(`[SKIP] No amount found for transaction ${tx.hash}`);
            return;
        }

        // Add debug logs before Transfer event search
        this.logToFile(`[DEBUG] Searching for Transfer event in ${receipt.logs.length} logs`);

        // For token transfers, check the Transfer event's "to" address
        const transferEvent = receipt.logs
            .find(log => {
                try {
                    // Add debug log for each log being checked
                    this.logToFile(`[DEBUG] Checking log: address=${log.address.toLowerCase()}`);
                    if (token.contractAddress && log.address.toLowerCase() !== token.contractAddress.toLowerCase()) {
                        this.logToFile(`[DEBUG] Log address doesn't match token contract`);
                        return false;
                    }

                    const contract = new Contract(token.contractAddress, ERC20_ABI, this.providers.get(`${chain}_${network}`));
                    const parsedLog = contract.interface.parseLog(log);
                    this.logToFile(`[DEBUG] Parsed log event name: ${parsedLog?.name}`);
                    return parsedLog?.name === 'Transfer';
                } catch (error) {
                    this.logToFile(`[DEBUG] Error parsing log: ${error.message}`);
                    return false;
                }
            });

        if (!transferEvent) {
            this.logToFile(`[SKIP] No Transfer event found in transaction ${tx.hash}`);
            return;
        }

        // Rest of the existing code remains exactly the same...
        const contract = new Contract(token.contractAddress, ERC20_ABI, this.providers.get(`${chain}_${network}`));
        const parsedTransfer = contract.interface.parseLog(transferEvent);
        const transferTo = parsedTransfer.args.to.toLowerCase();

        this.logToFile(`[DEBUG] Transfer event found:`);
        this.logToFile(`  - To: ${transferTo}`);
        this.logToFile(`  - Amount: ${parsedTransfer.args.value.toString()}`);

        if (!walletMap.has(transferTo)) {
            this.logToFile(`[SKIP] Token transfer ${tx.hash} not to our wallets (to: ${transferTo})`);
            return;
        }

        // Continue with existing code...

        // After verifying the transfer event and recipient wallet...
        const wallet = walletMap.get(transferTo);
        
        // Check if deposit already exists
        const existingDeposit = await this.depositRepository.findOne({
            where: {
                txHash: tx.hash,
                blockchain: chainKey,
                network: network
            }
        });

        if (existingDeposit) {
            this.logToFile(`[SKIP] Deposit already exists for transaction ${tx.hash}`);
            return;
        }

        // Create deposit record only if it doesn't exist
        const deposit = this.depositRepository.create({
            userId: wallet.userId,
            walletId: wallet.id,
            tokenId: token.id,
            txHash: tx.hash,
            amount: amount,
            blockchain: chainKey,
            network: network,
            networkVersion: token.networkVersion,
            blockNumber: receipt.blockNumber,
            confirmations: 0,
            status: 'pending',
            metadata: {
                from: tx.from,
                blockHash: receipt.blockHash,
                contractAddress: token.contractAddress,
                fee: utils.formatEther(tx.gasPrice.mul(receipt.gasUsed))
            }
        });

        await this.depositRepository.save(deposit);
        this.logToFile(`[DEPOSIT] Created deposit record: ${JSON.stringify(deposit)}`);

        const user = await this.userRepository.findOne({
          where: { id: wallet.userId }
        });

        if (user?.email && user.notificationSettings?.Wallet?.Deposits) {
          await this.emailService.sendDepositCreatedEmail(
            user.email,
            user.fullName,
            amount,
            token.symbol || chain.toUpperCase()  // Use token symbol
          );
        }

    } catch (error) {
        this.logToFile(`[ERROR] Error in processEvmTransaction: ${error.message}`);
        this.logger.error(`Error processing transaction ${tx.hash}: ${error.message}`);
    }
}

  private async getTokenForTransaction(chain: string, tx: providers.TransactionResponse): Promise<Token | null> {
    try {
        if (!tx.to) return null;

        const chainKey = this.CHAIN_KEYS[chain] || chain;
        this.logToFile(`Getting token for tx ${tx.hash}`);
        
        // For native token transfers
        if (!tx.data || tx.data === '0x') {
            this.logToFile(`Native token transfer detected for ${chainKey}`);
            const token = await this.tokenRepository.findOne({
                where: {
                    blockchain: chainKey,
                    networkVersion: 'NATIVE',
                    isActive: true
                }
            });
            this.logToFile(`Found native token: ${JSON.stringify(token)}`);
            return token;
        }

        // For token transfers
        this.logToFile(`Token transfer detected:`);
        this.logToFile(`- Chain: ${chainKey}`);
        this.logToFile(`- Contract Address: ${tx.to}`);
        this.logToFile(`- Data: ${tx.data}`);
        this.logToFile(`- Value: ${tx.value.toString()}`);

        // Log the query parameters
        this.logToFile(`Searching for token with params: blockchain=${chainKey}, contractAddress=${tx.to.toLowerCase()}, isActive=true`);

        // Try to find token by contract address
        const token = await this.tokenRepository.findOne({
            where: {
                blockchain: chainKey,
                contractAddress: ILike(tx.to.toLowerCase()),  // Use ILike for case-insensitive comparison
                isActive: true
            }
        });

        if (token) {
            this.logToFile(`Found token by contract address: ${JSON.stringify(token)}`);
        return token;
        }

        this.logToFile(`No token found for contract address ${tx.to}`);
        return null;

    } catch (error) {
        this.logToFile(`Error getting token for tx ${tx.hash}: ${error.message}`);
        this.logger.error(`Error getting token for tx ${tx.hash}: ${error.message}`);
        return null;
    }
}

  private async getTransactionAmount(tx: providers.TransactionResponse, token: Token): Promise<string | null> {
    try {
      // Get provider based on blockchain and network from token metadata
      const networkType = token.metadata?.networks?.[0] || 'mainnet';
      const provider = this.providers.get(`${token.blockchain}_${networkType}`);
      
      // For native token transfers
      if (token.networkVersion === 'NATIVE') {
        return utils.formatUnits(tx.value, token.decimals);
      }

      // For token transfers
      const contract = new Contract(token.contractAddress, ERC20_ABI, provider);
      const transferEvent = (await tx.wait())?.logs
        .find(log => {
          try {
            return contract.interface.parseLog(log)?.name === 'Transfer';
          } catch {
            return false;
          }
        });

      if (!transferEvent) return null;

      const parsedLog = contract.interface.parseLog(transferEvent);
      return utils.formatUnits(parsedLog.args.value, token.decimals);

    } catch (error) {
      this.logger.error(`Error getting amount for tx ${tx.hash}: ${error.message}`);
      return null;
    }
  }

  private async updateWalletBalance(deposit: Deposit) {
    // Start transaction
    await this.walletBalanceRepository.manager.transaction(async manager => {
      // Get token first
      const token = await manager.findOne(Token, {
        where: { id: deposit.tokenId }
      });

      // Get wallet balance
      const balance = await manager.findOne(WalletBalance, {
        where: {
          userId: deposit.userId,
          baseSymbol: token.baseSymbol || token.symbol,
          type: 'funding'
        }
      });

      if (!balance) {
        throw new Error('Wallet balance not found');
      }

      // Update balance
      balance.balance = new Decimal(balance.balance)
        .plus(deposit.amount)
        .toString();

      await manager.save(balance);
    });
  }

  private async monitorBitcoin() {
    for (const network of ['mainnet', 'testnet']) {
      const provider = this.providers.get(`btc_${network}`);
      this.logger.log(`Started monitoring Bitcoin ${network} blocks`);
      
      setInterval(async () => {
        await this.checkBitcoinBlocks(network);
      }, this.PROCESSING_DELAYS.bitcoin.checkInterval);
    }
  }

  private async checkBitcoinBlocks(network: string, startBlock?: number) {
    if (!await this.getLock('btc', network)) return;

    try {
      const provider = this.providers.get(`btc_${network}`);
      if (!provider) return;

      const currentHeight = await this.getBitcoinBlockHeight(provider);
      const lastProcessedBlock = startBlock || await this.getLastProcessedBlock('btc', network);

      for (let height = lastProcessedBlock + 1; height <= currentHeight; height++) {
        if (!this.chainMonitoringStatus['btc'][network]) break;

        try {
          const block = await this.getBitcoinBlock(provider, height);
          if (block) {
            await this.processBitcoinBlock('btc', network, block);
            // Update last processed block after each successful block
            await this.updateLastProcessedBlock('btc', network, height);
          }
        } catch (error) {
          this.logger.error(`Error processing Bitcoin block ${height}:`, error);
        }
      }

      return currentHeight;
    } finally {
      this.releaseLock('btc', network);
    }
  }

  private async processBitcoinBlock(chain: string, network: string, block: BitcoinBlock) {
    // Add this debug log
    this.logToFile(`Full Bitcoin block data: ${JSON.stringify(block, null, 2)}`);
    
    // Rest of the existing code stays exactly the same
    if (!block || !block.tx) {
        this.logger.warn(`Skipping invalid Bitcoin block for ${chain} ${network}: ${JSON.stringify(block)}`);
        return;
    }

    try {
        this.logger.log(`${chain} ${network}: Processing block ${block.height} with ${block.tx.length} transactions`);
        
        // Process transactions
        for (const tx of block.tx) {
            // Add block height to tx object instead of changing method signature
            tx.blockHeight = block.height;  // Add this line
            await this.processBitcoinTransaction(chain, network, tx);
        }

        // Add this line to update confirmations
        await this.updateBitcoinConfirmations(network, block.height);

        // Save progress using btc prefix
        await this.saveLastProcessedBlock(chain, network, block.height);
        
        const savedBlock = await this.getLastProcessedBlock(chain, network);
        this.logger.debug(`${chain} ${network}: Verified saved block ${savedBlock}`);
        
        this.logger.log(`${chain} ${network}: Completed block ${block.height}`);
    } catch (error) {
        this.logger.error(`Error processing ${chain} ${network} block ${block.height}: ${error.message}`);
        throw error;
    }
  }

  private async bitcoinRpcCall(provider: any, method: string, params: any[]) {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No need for Authorization header with QuickNode
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data.result;
  }

  private async getBitcoinTokenId(): Promise<string> {
    const token = await this.tokenRepository.findOne({
      where: {
        symbol: 'BTC',
        networkVersion: 'NATIVE'
      }
    });
    
    if (!token) {
      throw new Error('Bitcoin token not found in database');
    }
    
    return token.id.toString();
  }

  private async getBitcoinBlockHeight(provider: any): Promise<number> {
    try {
      const response = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getblockcount',
          params: [],
          id: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`Bitcoin RPC error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      this.logger.error('Error getting Bitcoin block height:', error);
      throw error;
    }
  }

  private async getBitcoinBlock(provider: any, blockNumber: number): Promise<BitcoinBlock> {
    try {
      // First get block hash
      const hashResponse = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getblockhash',
          params: [blockNumber],
          id: Date.now()
        })
      });

      const hashData = await hashResponse.json();
      if (hashData.error) {
        throw new Error(`Bitcoin RPC error: ${hashData.error.message}`);
      }

      // Then get block details
      const blockResponse = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getblock',
          params: [hashData.result, 2], // Verbosity level 2 for full transaction details
          id: Date.now()
        })
      });

      const blockData = await blockResponse.json();
      if (blockData.error) {
        throw new Error(`Bitcoin RPC error: ${blockData.error.message}`);
      }

      return blockData.result;
    } catch (error) {
      this.logger.error(`Error getting Bitcoin block ${blockNumber}:`, error);
      throw error;
    }
  }

  private async getStartingBlock(chain: string, network: string): Promise<number> {
    try {
      // Try to get configured start block
      const key = `start_block_${chain}_${network}`;
      const setting = await this.systemSettingsRepository.findOne({
        where: { key }
      });

      if (setting) {
        return parseInt(setting.value);
      }

      // If no configured start block, get current block and use safe defaults
      const currentBlock = await this.getCurrentBlockHeight(chain, network);
      const defaultOffset = this.CONFIRMATION_BLOCKS[chain][network];
      return Math.max(1, currentBlock - defaultOffset);

    } catch (error) {
      this.logger.error(`Error getting start block for ${chain} ${network}: ${error.message}`);
      return 1; // Fallback to block 1 if everything fails
    }
  }

  private async getLastProcessedBlock(chain: string, network: string): Promise<number> {
    try {
      const key = `last_processed_block_${chain}_${network}`;
      const setting = await this.systemSettingsRepository.findOne({
        where: { key }
      });

      if (setting) {
        return parseInt(setting.value);
      }

      // If no last processed block, get the configured start block
      return await this.getStartingBlock(chain, network);

    } catch (error) {
      this.logger.error(`Error getting last processed block for ${chain} ${network}: ${error.message}`);
      return 0;
    }
  }

  private getChainKey(blockchain: string): string {
    return this.CHAIN_KEYS[blockchain] || blockchain;
  }

  private async saveLastProcessedBlock(chain: string, network: string, blockNumber: number) {
    const chainKey = chain.toLowerCase() === 'bitcoin' ? 'btc' : chain.toLowerCase();
      const key = `last_processed_block_${chainKey}_${network}`;
      
    try {
      this.logger.debug(`Attempting to save with key: ${key}, value: ${blockNumber}`);
      
        // Use raw query for debugging
        await this.systemSettingsRepository.query(
            `INSERT INTO system_settings (key, value, "createdAt", "updatedAt") 
             VALUES ($1, $2, NOW(), NOW())
             ON CONFLICT (key) DO UPDATE 
             SET value = $2, "updatedAt" = NOW()`,
        [key, blockNumber.toString()]
      );
      
      this.logger.log(`Saved last processed block for ${chainKey} ${network}: ${blockNumber}`);
        
        // Verify the save
        const saved = await this.systemSettingsRepository.findOne({ where: { key } });
        if (saved && parseInt(saved.value) === blockNumber) {
            this.logger.debug(`${chainKey} ${network} Debug - Block ${blockNumber} saved successfully. Verified value: ${saved.value}`);
        } else {
            this.logger.error(`Failed to verify saved block for ${chainKey} ${network}. Expected: ${blockNumber}, Got: ${saved?.value}`);
            throw new Error(`Block save verification failed for ${chainKey} ${network}`);
        }
    } catch (error) {
        this.logger.error(`Error saving last processed block for ${chainKey} ${network}: ${error.message}`);
        throw error;
    }
  }

  // Add retry logic for EVM transaction fetching
  private async getEvmTransactionWithRetry(provider: providers.Provider, txHash: string, retries = 3): Promise<providers.TransactionResponse | null> {
    for (let i = 0; i < retries; i++) {
        try {
            const tx = await provider.getTransaction(txHash);
            return tx;
        } catch (error) {
            if (i === retries - 1) {
                throw error;
            }
            // Wait before retry, increasing delay each time
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    return null;
  }

  private async monitorTron() {
    for (const network of ['mainnet', 'testnet']) {
      const tronWeb = this.providers.get(`trx_${network}`) as TronWebInstance;
      if (!tronWeb) continue;
      
      this.logger.log(`Started monitoring TRON ${network} blocks`);
      
      setInterval(async () => {
        await this.checkTronBlocks(network, tronWeb);
      }, this.PROCESSING_DELAYS.trx.checkInterval);
    }
  }

  private async checkTronBlocks(network: string, tronWeb: TronWebInstance, initialBlock?: number) {
    if (!await this.getLock('trx', network)) return;

    try {
      const latestBlock = await tronWeb.trx.getCurrentBlock();
      const currentBlockNumber = latestBlock.block_header.raw_data.number;
      const lastProcessedBlock = initialBlock || await this.getLastProcessedBlock('trx', network);

      for (let height = lastProcessedBlock + 1; height <= currentBlockNumber; height++) {
        if (!this.chainMonitoringStatus['trx'][network]) break;

        try {
          const block = await this.getTronBlockWithRetry(tronWeb, height, 3);
          if (block) {
            await this.processTronBlock(network, block);
            // Update last processed block after each successful block
            await this.updateLastProcessedBlock('trx', network, height);
          }
        } catch (error) {
          this.logger.error(`Error processing TRON block ${height}:`, error);
        }
      }
    } finally {
      this.releaseLock('trx', network);
    }
  }

  private async getTronBlockWithRetry(
    tronWeb: TronWebInstance, 
    height: number, 
    maxRetries: number
  ): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const block = await tronWeb.trx.getBlock(height);
        return block;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
    return null;
  }

  private async processTronBlock(network: string, block: any) {
    try {
      this.logToFile(`[TRON] Processing block ${block.block_header.raw_data.number} for network ${network}`);

      // Get all TRON wallets
      const wallets = await this.walletRepository.find({
        where: {
          blockchain: 'trx',
          network,
        },
      });

      this.logToFile(`[TRON] Found ${wallets.length} wallets for network ${network}`);
      const walletAddresses = new Set(wallets.map(w => w.address));
      this.logToFile(`[TRON] Wallet addresses: ${Array.from(walletAddresses).join(', ')}`);

      const provider = this.providers.get(`trx_${network}`) as TronWebInstance;

      // Process each transaction
      this.logToFile(`[TRON] Processing ${block.transactions?.length || 0} transactions`);
      for (const tx of block.transactions || []) {
        try {
        if (tx.raw_data?.contract?.[0]?.type === 'TransferContract' || 
              tx.raw_data?.contract?.[0]?.type === 'TransferAssetContract' ||
              tx.raw_data?.contract?.[0]?.type === 'TriggerSmartContract') {  // Add this type
          
          const contract = tx.raw_data.contract[0];
            this.logToFile(`[TRON] Processing ${contract.type} transaction ${tx.txID}`);
            
            let toAddress;
            let amount;
            let contractAddress;
            let parameter = contract.parameter.value;  // Move this up

            if (contract.type === 'TriggerSmartContract') {
                // Handle TRC20 transfer
                contractAddress = parameter.contract_address;
                
                // Decode the data to get 'to' address and amount
                // The data format for TRC20 transfer is: transfer(address,uint256)
                const data = parameter.data;
                if (data.startsWith('a9059cbb')) { // This is the method ID for 'transfer(address,uint256)'
                    const to = '41' + data.substr(32, 40); // Extract recipient address
                    toAddress = provider.address.fromHex(to);
                    amount = parseInt(data.substr(72), 16); // Extract amount
                    
                    this.logToFile(`[TRON] TRC20 Transfer Details:
                        Contract Address: ${contractAddress}
                        To Address: ${toAddress}
                        Amount (raw): ${amount}
                    `);
                }
            } else {
                // Existing code for native/TRC10 transfers
                toAddress = provider.address.fromHex(parameter.to_address);
                amount = parameter.amount;
            }

            this.logToFile(`[TRON] Transaction to address: ${toAddress}`);

          if (walletAddresses.has(toAddress)) {
              this.logToFile(`[TRON] Found matching wallet for address ${toAddress}`);
            const wallet = wallets.find(w => w.address === toAddress);
              
              // Check if deposit already exists
              const existingDeposit = await this.depositRepository.findOne({
                where: {
                  txHash: tx.txID,
                  blockchain: 'trx',
                  network
                }
              });

              if (existingDeposit) {
                this.logToFile(`[TRON] Deposit already exists for transaction ${tx.txID}`);
                continue;
              }

              const token = await this.getTronToken(contract.type, parameter.asset_name, contractAddress, network);
              this.logToFile(`[TRON] Token lookup params: type=${contract.type}, contractAddress=${contractAddress}`);
              this.logToFile(`[TRON] Token found: ${JSON.stringify(token)}`);

            if (token) {
                  // Convert amount based on token decimals
                  const normalizedAmount = (amount / Math.pow(10, token.decimals)).toString();
                  this.logToFile(`[TRON] Creating deposit for amount ${normalizedAmount} ${token.symbol}`);

                  // Get transaction info to get the fee
                  const txInfo = await provider.trx.getTransactionInfo(tx.txID);
                  const fee = txInfo?.fee ? (txInfo.fee / 1e6).toString() : '0';
                  this.logToFile(`[TRON] Transaction fee: ${fee} TRX`);

                  const deposit = await this.depositRepository.save({
                userId: wallet.userId,
                walletId: wallet.id,
                tokenId: token.id,
                txHash: tx.txID,
                    amount: normalizedAmount,
                blockchain: 'trx',
                network,
                networkVersion: token.networkVersion,
                blockNumber: block.block_header.raw_data.number,
                status: 'pending',
                metadata: {
                  from: provider.address.fromHex(parameter.owner_address),
                  contractAddress: token.contractAddress,
                  blockHash: block.blockID,
                      fee: fee  // Add transaction fee to metadata
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                confirmations: 0
              });

                  this.logToFile(`[TRON] Created deposit record: ${JSON.stringify(deposit)}`);

                  // Add email notification
                  const user = await this.userRepository.findOne({
                    where: { id: wallet.userId }
                  });

                  if (user?.email && user.notificationSettings?.Wallet?.Deposits) {
                    await this.emailService.sendDepositCreatedEmail(
                      user.email,
                      user.fullName,
                      normalizedAmount,
                      token.symbol || 'TRX'  // We already have the token from getTronToken()
                    );
                    this.logToFile(`[TRON] Sent deposit creation email for ${deposit.id} with token ${token.symbol}`);
                  }
                } else {
                  this.logToFile(`[TRON] No token found for transaction ${tx.txID}`);
            }
          }
        }
        } catch (error) {
          this.logToFile(`[TRON] Error processing transaction ${tx.txID}: ${error.message}`);
          continue;
      }
      }

      // Add this: Update confirmations after processing the block
      await this.updateTronConfirmations(network, block.block_header.raw_data.number);

    } catch (error) {
      this.logToFile(`[TRON] Error processing block: ${error.message}`);
      this.logger.error(`Error processing TRON block: ${error.message}`);
    }
  }

  private async updateTronConfirmations(network: string, currentBlock: number) {
    try {
      const deposits = await this.depositRepository.find({
        where: {
          blockchain: 'trx',
          network: network,
          status: In(['pending', 'confirming']),
          blockNumber: Not(IsNull()),
        },
      });

      for (const deposit of deposits) {
        const oldStatus = deposit.status;
        const confirmations = currentBlock - deposit.blockNumber;
        const requiredConfirmations = this.CONFIRMATION_BLOCKS.trx[network];

        await this.depositRepository.update(deposit.id, {
          confirmations,
          status: confirmations >= requiredConfirmations ? 'confirmed' : 'confirming'
        });

        if (oldStatus !== 'confirmed' && confirmations >= requiredConfirmations) {
          const wallet = await this.walletRepository.findOne({
            where: { id: deposit.walletId }
          });
          
          if (wallet) {
            const user = await this.userRepository.findOne({
              where: { id: wallet.userId }
            });

            // Get token details for the correct symbol
            const token = await this.tokenRepository.findOne({
              where: { id: deposit.tokenId }
            });

            if (user?.email && user.notificationSettings?.Wallet?.Deposits) {
              await this.emailService.sendDepositConfirmedEmail(
                user.email,
                user.fullName,
                this.formatAmount(deposit.amount),
                token?.symbol || 'TRX'
              );
            }
          }

          await this.updateWalletBalance(deposit);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating Tron confirmations: ${error.message}`);
    }
  }

  private async getTronToken(
    contractType: string, 
    assetName?: string, 
    contractAddress?: string, 
    network?: string
  ): Promise<Token | null> {
    if (contractType === 'TransferContract') {
      return this.tokenRepository.findOne({
        where: {
          blockchain: 'trx',
          networkVersion: 'NATIVE',
          isActive: true
        }
      });
    }

    if (contractType === 'TransferAssetContract' && assetName) {
      return this.tokenRepository.findOne({
        where: {
          blockchain: 'trx',
          networkVersion: 'TRC10',
          symbol: assetName,
          isActive: true
        }
      });
    }

    if (contractType === 'TriggerSmartContract' && contractAddress && network) {
      const provider = this.providers.get(`trx_${network}`) as TronWebInstance;
      
      // Convert hex address to base58
      const base58Address = provider.address.fromHex(contractAddress);
      this.logToFile(`[getTronToken] Converting contract address from hex ${contractAddress} to base58 ${base58Address}`);

      return this.tokenRepository.findOne({
        where: {
          blockchain: 'trx',
          networkVersion: 'TRC20',
          contractAddress: base58Address,
          isActive: true
        }
      });
    }

    return null;
  }

  public async testConnection(chain: string) {
    try {
      switch (chain) {
        case 'ethereum':
        case 'bsc': {
          const provider = this.providers.get(`${chain}_mainnet`) as JsonRpcProvider;
          const blockNumber = await provider.getBlockNumber();
          return { blockNumber, network: 'mainnet' };
        }
        
        case 'bitcoin': {
          const provider = this.providers.get('btc_mainnet');
          const blockCount = await this.bitcoinRpcCall(provider, 'getblockcount', []);
          return { blockNumber: blockCount, network: 'mainnet' };
        }
        
        case 'trx': {
          const tronWeb = this.providers.get('trx_mainnet') as TronWebInstance;
          const block = await tronWeb.trx.getCurrentBlock();
          return { 
            blockNumber: block.block_header.raw_data.number,
            network: 'mainnet'
          };
        }
        
        default:
          throw new Error(`Unsupported chain: ${chain}`);
      }
    } catch (error) {
      this.logger.error(`Error testing ${chain} connection: ${error.message}`);
      throw error;
    }
  }

  // Add this method to process Bitcoin transactions
  private async processBitcoinTransaction(chain: string, network: string, tx: any) {
    try {
        this.logToFile(`Processing Bitcoin transaction: ${tx.txid}`);
        
        // Get all wallets for this chain/network
        const wallets = await this.walletRepository.find({
            where: {
                blockchain: 'bitcoin', // Changed from 'btc' to 'bitcoin'
                network: network,
            }
        });

        this.logToFile(`Found ${wallets.length} bitcoin ${network} wallets to check against`);
        
        // Create address lookup map for efficient checking
        const walletMap = new Map(wallets.map(w => [w.address, w]));

        // Check each output in the transaction
        if (tx.vout && Array.isArray(tx.vout)) {
            this.logToFile(`Transaction ${tx.txid} has ${tx.vout.length} outputs`);
            
            for (const output of tx.vout) {
                const address = output.scriptPubKey?.address || 
                             (output.scriptPubKey?.addresses && output.scriptPubKey.addresses[0]);
                
                this.logToFile(`Checking output - Address: ${address}, Amount: ${output.value}`);
                
                if (address && walletMap.has(address)) {
                    this.logToFile(`🎯 Found matching deposit to wallet ${walletMap.get(address).address} in tx ${tx.txid}`);
                    
                    // Check if deposit already exists
                    const existingDeposit = await this.depositRepository.findOne({
                        where: {
                            txHash: tx.txid,
                            blockchain: chain,
                            network: network
                        }
                    });

                    if (existingDeposit) {
                        this.logToFile(`[SKIP] Bitcoin deposit already exists for transaction ${tx.txid}`);
                        continue;
                    }
                    
                    const token = await this.tokenRepository.findOne({
                        where: {
                            symbol: 'BTC',
                            blockchain: 'bitcoin',
                            isActive: true
                        }
                    });

                    this.logToFile(`Token found: ${token ? 'yes' : 'no'}, tokenId: ${token?.id}`);
                    this.logToFile(`Network configs: ${JSON.stringify(token?.networkConfigs)}`);

                    if (!token) {
                        this.logToFile(`❌ BTC token not found for ${chain}`);
                        return;
                    }

                    // Check all versions for network support
                    const supportedVersion = Object.keys(token.networkConfigs || {}).find(version => 
                        token.networkConfigs[version]?.[network]?.isActive
                    );

                    this.logToFile(`Supported versions found: ${supportedVersion || 'none'}`);

                    if (!supportedVersion) {
                        this.logToFile(`❌ No active network config found for BTC ${network}`);
                        return;
                    }

                    // Create deposit record with the found version
                    try {
                        // Get the previous transaction to find the sender address
                        const prevTx = tx.vin[0];
                        let fromAddress = '';
                        
                        if (prevTx?.txid) {
                            try {
                                const provider = this.providers.get(`btc_${network}`);
                                const prevTxDetails = await this.getBitcoinTransaction(provider, prevTx.txid);
                                // Get address from the previous transaction's output that was spent
                                fromAddress = prevTxDetails?.vout[prevTx.vout]?.scriptPubKey?.address || 
                                             prevTxDetails?.vout[prevTx.vout]?.scriptPubKey?.addresses?.[0] || '';
                                
                                this.logToFile(`Previous transaction output address: ${fromAddress}`);
                            } catch (error) {
                                this.logToFile(`Error getting previous transaction: ${error.message}`);
                            }
                        }

                        // Add this right before the depositRepository.save call
                        this.logToFile(`Transaction data for ${tx.txid}:`);
                        this.logToFile(`Block height: ${tx.blockheight}`);
                        this.logToFile(`Block height alt: ${tx.height}`);
                        this.logToFile(`Block hash: ${tx.blockhash}`);
                        this.logToFile(`Raw tx data: ${JSON.stringify(tx, null, 2)}`);

                        const deposit = await this.depositRepository.save({
                            userId: walletMap.get(address).userId,
                            walletId: walletMap.get(address).id,
                            tokenId: token.id,
                            txHash: tx.txid,
                            amount: output.value.toString(),
                            blockchain: chain,
                            network: network,
                            networkVersion: supportedVersion || 'NATIVE',
                            blockNumber: tx.blockHeight,  // Use the height we added to tx
                            status: 'pending',
                            metadata: {
                                from: fromAddress,
                                blockHash: tx.blockhash,
                                fee: tx.fee?.toString() || ''
                            }
                        });
                        this.logToFile(`✅ Created deposit record ${deposit.id} for tx ${tx.txid} using version ${supportedVersion}`);

                        // Move email notification here where we have access to address and amount
                        const user = await this.userRepository.findOne({
                            where: { id: walletMap.get(address).userId }
                        });

                        if (user?.email && user.notificationSettings?.Wallet?.Deposits) {
                            await this.emailService.sendDepositCreatedEmail(
                                user.email,
                                user.fullName,
                                output.value.toString(),
                                'BTC'
                            );
                        }
                    } catch (error) {
                        this.logToFile(`❌ Error creating deposit: ${error.message}`);
                        throw error;
                    }
                }
            }
        }
    } catch (error) {
        this.logger.error(`Error processing Bitcoin transaction ${tx.txid}: ${error.message}`);
        this.logToFile(`Error: ${error.message}`);
        // Don't throw to prevent blocking other transactions
    }
}


private async getBitcoinTransaction(provider: any, txid: string) {
    try {
        // Use the existing bitcoinRpcCall method instead of direct fetch
        const txDetails = await this.bitcoinRpcCall(provider, 'getrawtransaction', [txid, true]);
        return txDetails;
    } catch (error) {
        this.logToFile(`❌ Error getting Bitcoin transaction ${txid}: ${error.message}`);
        throw error;
    }
}

  private async monitorXrp() {
    for (const network of ['mainnet', 'testnet']) {
      const provider = this.providers.get(`xrp_${network}`);
      if (!provider) continue;
      
      this.logger.log(`Started monitoring XRP ${network} blocks`);
      
      setInterval(async () => {
        await this.checkXrpBlocks(network);
      }, this.PROCESSING_DELAYS.xrp.checkInterval);
    }
  }

  private async checkXrpBlocks(network: string, startBlock?: number) {
    if (!await this.getLock('xrp', network)) return;

    try {
      let provider = this.providers.get(`xrp_${network}`) as Client;
      if (!provider) return;

      // Get current ledger info
      const serverInfo = await provider.request({ command: 'server_info' });
      const currentLedger = serverInfo.result.info.validated_ledger.seq;
      let lastProcessedBlock = startBlock || await this.getLastProcessedBlock('xrp', network);

      // If we're caught up, just wait
      if (lastProcessedBlock >= currentLedger) {
        this.logToFile(`[XRP] ${network}: Caught up at ledger ${currentLedger}, waiting for new ledgers...`);
        await new Promise(resolve => setTimeout(resolve, this.PROCESSING_DELAYS.xrp.blockDelay));
        return;
      }

      // Process blocks sequentially
      this.logToFile(`[XRP] ${network}: Processing from ledger ${lastProcessedBlock + 1} to ${currentLedger}`);
      
      for (let ledgerIndex = lastProcessedBlock + 1; ledgerIndex <= currentLedger; ledgerIndex++) {
        if (!this.chainMonitoringStatus['xrp']?.[network]) break;

        try {
          // Ensure connection
          if (!provider.isConnected()) {
            this.logToFile(`[XRP] ${network}: Reconnecting to provider...`);
            await provider.connect();
          }

          await this.processXrpLedger('xrp', network, ledgerIndex);
          await this.updateLastProcessedBlock('xrp', network, ledgerIndex);
          lastProcessedBlock = ledgerIndex;
          
          this.logToFile(`[XRP] ${network}: Processed ledger ${ledgerIndex}`);
        } catch (error) {
          if (error.message.includes('ledgerNotFound')) {
            this.logToFile(`[XRP] ${network}: Ledger ${ledgerIndex} not found, skipping`);
            continue;
          }

          if (error.message.includes('websocket was closed') || error.message.includes('NotConnectedError')) {
            this.logToFile(`[XRP] ${network}: Connection lost, attempting to reconnect...`);
            try {
              await provider.connect();
              ledgerIndex--; // Retry the same ledger after reconnecting
              continue;
            } catch (reconnectError) {
              this.logToFile(`[XRP] ${network}: Failed to reconnect: ${reconnectError.message}`);
              
              const fallbackProvider = await this.createProviderWithFallback('xrp', network) as Client;
              if (fallbackProvider) {
                this.logToFile(`[XRP] ${network}: Switching to fallback provider`);
                this.providers.set(`xrp_${network}`, fallbackProvider);
                provider = fallbackProvider;
                ledgerIndex--;
                continue;
              }
              break;
            }
          }

          this.logToFile(`[XRP] ${network}: Error processing ledger ${ledgerIndex}: ${error.message}`);
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.releaseLock('xrp', network);
    }
  }

  private async processXrpLedger(chain: string, network: string, ledgerIndex: number) {
    try {
        const provider = this.providers.get(`xrp_${network}`) as Client;
        
      this.logToFile(`[XRP] Processing ledger ${ledgerIndex} for network ${network}`);
      
        const ledgerResponse = await provider.request({
            command: 'ledger',
            ledger_index: ledgerIndex,
            transactions: true,
            expand: true
        });
        
        if (!ledgerResponse.result.ledger) {
        this.logToFile(`[XRP] Ledger ${ledgerIndex} not found`);
            throw new Error('ledgerNotFound');
        }
        
        const transactions = ledgerResponse.result.ledger.transactions || [];
      this.logToFile(`[XRP] Found ${transactions.length} transactions in ledger ${ledgerIndex}`);

        for (const tx of transactions) {
        // Log the full transaction first to understand its structure
        this.logToFile(`[XRP] Raw transaction: ${JSON.stringify(tx)}`);
            await this.processXrpTransaction(chain, network, tx);
        }

        await this.updateXrpConfirmations(network, ledgerIndex);
      this.logToFile(`[XRP] Completed processing ledger ${ledgerIndex}`);
    } catch (error) {
      this.logToFile(`[XRP] Error processing ledger ${ledgerIndex}: ${error.message}`);
      throw error;
    }
  }

  private async processXrpTransaction(chain: string, network: string, tx: any) {
    try {
      const txJson = tx.tx_json;
      if (!txJson) {
        this.logToFile(`[XRP] No tx_json found in transaction`);
        return;
      }

      const txType = txJson.TransactionType;
      const txHash = tx.hash;
      const destination = txJson.Destination;
      const rawAmount = tx.meta?.delivered_amount || txJson.Amount || txJson.DeliverMax;
      // Convert from drops to XRP (1 XRP = 1,000,000 drops)
      const amount = (Number(rawAmount) / 1_000_000).toString();

      if (txType !== 'Payment') {
        this.logToFile(`[XRP] Skipping non-payment transaction ${txHash} of type ${txType}`);
        return;
      }

      const wallet = await this.walletRepository.findOne({
        where: {
          blockchain: chain,
          network: network,
          address: destination
        }
      });

      if (!wallet) {
        this.logToFile(`[XRP] No matching wallet found for destination ${destination}`);
        return;
      }

      // Check for existing deposit
      const existingDeposit = await this.depositRepository.findOne({
        where: {
          txHash: txHash,
          blockchain: chain,
          network: network
        }
      });

      if (existingDeposit) {
        this.logToFile(`[XRP] Deposit already exists for transaction ${txHash}`);
        return;
      }

        const tokenId = await this.getXrpTokenId();
      this.logToFile(`[XRP] Creating deposit for transaction ${txHash} with amount ${amount}`);

      const deposit = await this.depositRepository.save({
          userId: wallet.userId.toString(),
          walletId: wallet.id.toString(),
          tokenId: tokenId.toString(),
        txHash: txHash,
        amount: amount,  // Now in XRP instead of drops
          blockchain: chain,
          network: network,
          networkVersion: 'NATIVE',
          blockNumber: tx.ledger_index,
          status: 'pending',
          metadata: {
          fee: (Number(txJson.Fee) / 1_000_000).toString(),  // Convert fee to XRP too
          from: txJson.Account,
            blockHash: tx.ledger_hash,
          contractAddress: null,
          timestamp: tx.close_time_iso
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          confirmations: 0
        });

      // Get user info for email
      const user = await this.userRepository.findOne({
        where: { id: wallet.userId }
      });

      if (user && user.email) {
        await this.emailService.sendDepositCreatedEmail(
          user.email,
          user.fullName || 'Valued Customer',
          amount,
          'XRP'
        );
      }

      this.logToFile(`[XRP] Created deposit record: ${JSON.stringify(deposit)}`);
    } catch (error) {
      this.logToFile(`[XRP] Error processing transaction ${tx.hash}: ${error.message}`);
      this.logToFile(`[XRP] Error stack: ${error.stack}`);
    }
  }

  private async getXrpTokenId(): Promise<string> {
    const token = await this.tokenRepository.findOne({
      where: {
        symbol: 'XRP',
        networkVersion: 'NATIVE'
      }
    });
    
    if (!token) {
      throw new Error('XRP token not found in database');
    }
    
    return token.id.toString();
  }

  private async getLock(chain: string, network: string): Promise<boolean> {
    const key = `${chain}_${network}`;
    if (this.processingLocks.get(key) || !this.chainMonitoringStatus[chain][network]) {
      return false;
    }
    this.processingLocks.set(key, true);
    return true;
  }

  private releaseLock(chain: string, network: string) {
    const key = `${chain}_${network}`;
    this.processingLocks.set(key, false);
  }

  async getCurrentBlockHeight(chain: string, network: string, provider?: any): Promise<number> {
    try {
      // Use passed provider or get from initialized providers
      const rpcProvider = provider || this.providers.get(`${chain}_${network}`);
      if (!rpcProvider) {
        throw new Error(`No provider found for ${chain} ${network}`);
      }

      switch (chain) {
        case 'eth':
        case 'bsc':
          return await rpcProvider.getBlockNumber();
        case 'btc':
          return await this.getBitcoinBlockHeight(rpcProvider);
        case 'trx':
          const block = await rpcProvider.trx.getCurrentBlock();
          return block.block_header.raw_data.number;
        case 'xrp':
          try {
            await (rpcProvider as Client).connect();
            const serverInfo = await (rpcProvider as Client).request({
              command: 'server_info'
            });
            if (!serverInfo?.result?.info?.validated_ledger?.seq) {
              throw new Error('Invalid XRP server response');
            }
            return serverInfo.result.info.validated_ledger.seq;
          } catch (xrpError) {
            this.logger.error(`XRP ${network} connection error: ${xrpError.message}`);
            throw xrpError;
          }
        default:
          throw new Error(`Unsupported chain: ${chain}`);
      }
    } catch (error) {
      this.logger.error(`Error getting block height for ${chain}_${network}:`, error);
      throw error;
    }
  }

  // Public getter method
  async getMonitoringStatus() {
    this.logger.debug('Getting monitoring status...');
    try {
      return {
        isMonitoring: this.monitoringActive
      };
    } catch (error) {
      this.logger.error('Error getting monitoring status:', error);
      throw error;
    }
  }

  // Add methods for chain-specific monitoring
  async startChainMonitoring(
    chain: string, 
    network: string, 
    startPoint?: 'current' | 'start' | 'last',
    startBlock?: string
  ) {
    try {
      this.logger.debug(`Starting chain monitoring for ${chain} ${network} with startPoint: ${startPoint}`);
      
      let blockNumber: number | undefined;

      if (startPoint === 'start' && startBlock) {
        blockNumber = parseInt(startBlock);
        this.logger.debug(`Using provided start block: ${blockNumber}`);
      } else if (startPoint === 'last') {
        const lastBlock = await this.systemSettingsRepository.findOne({
          where: { key: `last_processed_block_${chain}_${network}` }
        });
        
        if (lastBlock?.value) {
          blockNumber = parseInt(lastBlock.value);
          // Add 1 to start from next block after last processed
          blockNumber += 1;
          this.logger.debug(`Using last processed block + 1: ${blockNumber}`);
        } else {
          this.logger.warn(`No last processed block found for ${chain} ${network}, using current block`);
          blockNumber = await this.getCurrentBlockHeight(chain, network);
          this.logger.debug(`Using current block: ${blockNumber}`);
        }
      } else {
        // For 'current' or undefined startPoint
        blockNumber = await this.getCurrentBlockHeight(chain, network);
        this.logger.debug(`Using current block: ${blockNumber}`);
      }

      // Initialize chain status if not exists
      if (!this.chainMonitoringStatus[chain]) {
        this.chainMonitoringStatus[chain] = {};
      }
      this.chainMonitoringStatus[chain][network] = true;

      // Log the monitoring status after setting
      this.logger.debug(`Chain monitoring status for ${chain} ${network}: ${this.chainMonitoringStatus[chain][network]}`);

      switch (chain) {
        case 'eth':
        case 'bsc':
          await this.monitorEvmChain(chain, network, blockNumber);
          break;
        case 'btc':
          this.monitorBitcoinChain(network, blockNumber);
          break;
        case 'trx':
          this.monitorTronChain(network, blockNumber);
          break;
        case 'xrp':
          this.monitorXrpChain(network, blockNumber);
          break;
        default:
          throw new Error(`Unsupported chain: ${chain}`);
      }

      this.logger.log(`Started monitoring ${chain.toUpperCase()} ${network} from block ${blockNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Error starting ${chain} ${network} monitoring:`, error);
      // Reset monitoring status on error
      if (this.chainMonitoringStatus[chain]) {
        this.chainMonitoringStatus[chain][network] = false;
      }
      throw error;
    }
  }

  async stopChainMonitoring(chain: string, network: string) {
    this.logger.debug(`Stopping ${chain} ${network} monitoring`);
    
    if (!this.chainMonitoringStatus[chain]) {
      this.chainMonitoringStatus[chain] = {};
    }
    this.chainMonitoringStatus[chain][network] = false;

    // Clear intervals and listeners based on chain type
    switch (chain) {
      case 'btc':
        if (network === 'mainnet' && this.btcMainnetInterval) {
          clearInterval(this.btcMainnetInterval);
          this.btcMainnetInterval = null;
        } else if (network === 'testnet' && this.btcTestnetInterval) {
          clearInterval(this.btcTestnetInterval);
          this.btcTestnetInterval = null;
        }
        break;
      
      case 'eth':
      case 'bsc':
        const providerKey = `${chain}_${network}`;
        const provider = this.providers.get(providerKey) as providers.Provider;
        const listener = this.evmBlockListeners.get(providerKey);
        if (provider && listener) {
          provider.removeListener('block', listener);
          this.evmBlockListeners.delete(providerKey);
        }
        break;

      case 'trx':
        if (network === 'mainnet' && this.tronMainnetInterval) {
          clearInterval(this.tronMainnetInterval);
          this.tronMainnetInterval = null;
        } else if (network === 'testnet' && this.tronTestnetInterval) {
          clearInterval(this.tronTestnetInterval);
          this.tronTestnetInterval = null;
        }
        break;

      case 'xrp':
        if (network === 'mainnet' && this.xrpMainnetInterval) {
          clearInterval(this.xrpMainnetInterval);
          this.xrpMainnetInterval = null;
        } else if (network === 'testnet' && this.xrpTestnetInterval) {
          clearInterval(this.xrpTestnetInterval);
          this.xrpTestnetInterval = null;
        }
        break;
    }

    this.logger.log(`Stopped monitoring ${chain} ${network}`);
    return true;
  }

  // Update the chain monitoring methods to accept network parameter
  
  private async monitorBitcoinChain(network: string, startBlock?: number) {
    const key = `btc_${network}`;
    
    // Clear any existing interval
    if (this.bitcoinIntervals[network]) {
        clearInterval(this.bitcoinIntervals[network]);
        this.bitcoinIntervals[network] = null;
    }

    try {
        // Initialize monitoring status
        if (!this.chainMonitoringStatus['btc']) {
            this.chainMonitoringStatus['btc'] = {};
        }
        this.chainMonitoringStatus['btc'][network] = true;

        // Get initial block height if not provided
        if (!startBlock) {
            startBlock = await this.getCurrentBlockHeight('btc', network);
        }

        // Initialize last processed block
        this.lastProcessedBlocks[key] = startBlock ? (startBlock - 1).toString() : '0';
        
        this.logger.log(`Started monitoring Bitcoin ${network} blocks from block ${startBlock}`);

        const interval = setInterval(async () => {
            if (!this.chainMonitoringStatus['btc']?.[network]) {
                clearInterval(interval);
                return;
            }

            // Check if already processing
            if (this.processingLocks.get(key)) {
                return;
            }

            try {
                this.processingLocks.set(key, true);
                const currentBlock = await this.getCurrentBlockHeight('btc', network);
                const lastProcessed = parseInt(this.lastProcessedBlocks[key] || '0');
                const nextBlock = lastProcessed + 1;

                if (nextBlock > currentBlock) {
                    this.processingLocks.set(key, false);
                    return; // Caught up, wait for next interval
                }

                this.logger.debug(`BTC ${network}: Processing block ${nextBlock} (Current: ${currentBlock})`);
                const provider = this.providers.get(`btc_${network}`);
                if (!provider) {
                    this.logger.error(`No Bitcoin provider found for network ${network}`);
                    this.processingLocks.set(key, false);
                    return;
                }
                const block = await this.getBitcoinBlock(provider, nextBlock);
                
                if (block) {
                    this.logger.log(`BTC ${network}: Processing block ${nextBlock} with ${block.tx?.length || 0} transactions`);
                    await this.processBitcoinBlock('btc', network, block);
                    await this.updateLastProcessedBlock('btc', network, nextBlock);
                    this.lastProcessedBlocks[key] = nextBlock.toString();
                    this.logger.debug(`Processed Bitcoin ${network} block ${nextBlock}`);
                }
            } catch (error) {
                this.logger.error(`Error in Bitcoin ${network} monitoring:`, error);
            } finally {
                this.processingLocks.set(key, false);
            }
        }, this.PROCESSING_DELAYS.bitcoin.checkInterval);

        this.bitcoinIntervals[network] = interval;
        return true;
    } catch (error) {
        this.logger.error(`Failed to start Bitcoin ${network} monitoring:`, error);
        this.chainMonitoringStatus['btc'][network] = false;
        return false;
    }
}

  private async monitorTronChain(network: string, startBlock?: number) {
    // First clear any existing interval
    if (network === 'mainnet' && this.tronMainnetInterval) {
      clearInterval(this.tronMainnetInterval);
      this.tronMainnetInterval = null;
    } else if (network === 'testnet' && this.tronTestnetInterval) {
      clearInterval(this.tronTestnetInterval);
      this.tronTestnetInterval = null;
    }

    const tronWeb = this.providers.get(`trx_${network}`) as TronWebInstance;
    if (!tronWeb) {
      this.logger.warn(`No TRON provider found for network ${network}`);
      return false;
    }

    try {
      // Set monitoring status
      if (!this.chainMonitoringStatus['trx']) {
        this.chainMonitoringStatus['trx'] = {};
      }
      this.chainMonitoringStatus['trx'][network] = true;

      // Initialize with startBlock
      if (!startBlock) {
        startBlock = await this.getCurrentBlockHeight('trx', network);
      }
      
      // Set initial last processed block
      const key = `trx_${network}`;
      this.lastProcessedBlocks[key] = (startBlock - 1).toString();

      this.logger.log(`Started monitoring TRON ${network} blocks from block ${startBlock}`);

      const interval = setInterval(async () => {
        if (!this.chainMonitoringStatus['trx']?.[network]) {
          clearInterval(interval);
          return;
        }

        try {
          const latestBlock = await tronWeb.trx.getCurrentBlock();
          const currentBlockNumber = latestBlock.block_header.raw_data.number;
          const lastProcessed = this.lastProcessedBlocks[key];
          const nextBlock = lastProcessed ? parseInt(lastProcessed) + 1 : currentBlockNumber;

          if (nextBlock > currentBlockNumber) {
            this.logger.debug(`TRON ${network}: Caught up at block ${currentBlockNumber}, waiting...`);
            return;
          }

          this.logger.debug(`TRON ${network}: Processing block ${nextBlock} (Current: ${currentBlockNumber})`);
          const block = await this.getTronBlockWithRetry(tronWeb, nextBlock, 3);
          if (block) {
            this.logger.log(`TRON ${network}: Processing block ${nextBlock} with ${block.transactions?.length || 0} transactions`);
            await this.processTronBlock(network, block);
            await this.updateLastProcessedBlock('trx', network, nextBlock);
            this.logger.debug(`Processed TRON ${network} block ${nextBlock}`);
          }
        } catch (error) {
          this.logger.error(`Error in TRON ${network} monitoring:`, error);
        }
      }, this.PROCESSING_DELAYS.trx.checkInterval);

      if (network === 'mainnet') {
        this.tronMainnetInterval = interval;
      } else {
        this.tronTestnetInterval = interval;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to start TRON ${network} monitoring:`, error);
      this.chainMonitoringStatus['trx'][network] = false;
      return false;
    }
  }

  private async monitorXrpChain(network: string, startBlock?: number) {
    // First clear any existing interval
    if (network === 'mainnet' && this.xrpMainnetInterval) {
        clearInterval(this.xrpMainnetInterval);
        this.xrpMainnetInterval = null;
    } else if (network === 'testnet' && this.xrpTestnetInterval) {
        clearInterval(this.xrpTestnetInterval);
        this.xrpTestnetInterval = null;
    }

    const provider = this.providers.get(`xrp_${network}`) as Client;
    if (!provider) {
        this.logger.warn(`No XRP provider found for network ${network}`);
        return false;
    }

    try {
        if (!this.chainMonitoringStatus['xrp']) {
            this.chainMonitoringStatus['xrp'] = {};
        }
        this.chainMonitoringStatus['xrp'][network] = true;

        // Initialize with startBlock
        if (!startBlock) {
            startBlock = await this.getCurrentBlockHeight('xrp', network);
        }
        
        // Set initial last processed block
        const key = `xrp_${network}`;
        this.lastProcessedBlocks[key] = (startBlock - 1).toString();  // Add this line

        this.logger.log(`Started monitoring XRP ${network} blocks from block ${startBlock}`);

        const interval = setInterval(async () => {
            if (!this.chainMonitoringStatus['xrp']?.[network]) {
                clearInterval(interval);
                return;
            }

            try {
                const serverInfo = await provider.request({ command: 'server_info' });
                const currentLedger = serverInfo.result.info.validated_ledger.seq;
                const lastProcessed = this.lastProcessedBlocks[key];
                const nextBlock = lastProcessed ? parseInt(lastProcessed) + 1 : currentLedger;

                if (nextBlock > currentLedger) {
                    this.logger.debug(`XRP ${network}: Caught up at ledger ${currentLedger}, waiting for new ledgers...`);
                    return;
                }

                this.logger.debug(`XRP ${network}: Processing ledger ${nextBlock} (Current: ${currentLedger})`);
                await this.processXrpLedger('xrp', network, nextBlock);
                await this.updateLastProcessedBlock('xrp', network, nextBlock);
                this.logger.debug(`Processed XRP ${network} ledger ${nextBlock}`);

            } catch (error) {
                if (error.message.includes('ledgerNotFound')) {
                    this.logger.warn(`XRP ${network}: Ledger not found, skipping`);
                    return;
                }

                // Handle connection issues
                if (error.message.includes('websocket was closed') || error.message.includes('NotConnectedError')) {
                    this.logger.warn(`XRP ${network}: Connection lost, attempting to reconnect...`);
                    try {
                        await provider.connect();
                    } catch (reconnectError) {
                        this.logger.error(`Failed to reconnect XRP ${network}:`, reconnectError);
                        
                        // Try fallback provider
                        const fallbackProvider = await this.createProviderWithFallback('xrp', network) as Client;
                        if (fallbackProvider) {
                            this.providers.set(`xrp_${network}`, fallbackProvider);
                        }
                    }
                }

                this.logger.error(`Error in XRP ${network} monitoring:`, error);
            }
        }, this.PROCESSING_DELAYS.xrp.checkInterval);

        if (network === 'mainnet') {
            this.xrpMainnetInterval = interval;
        } else {
            this.xrpTestnetInterval = interval;
        }

        return true;
    } catch (error) {
        this.logger.error(`Failed to start XRP ${network} monitoring:`, error);
        this.chainMonitoringStatus['xrp'][network] = false;
        return false;
    }
}

  async getBlockInfo() {
    try {
      const currentBlocks: { [key: string]: number } = {};
      const savedBlocks: { [key: string]: string } = {};
      const lastProcessedBlocks: { [key: string]: string } = {};

      // Get current blocks for each chain
      const chains = ['eth', 'bsc', 'btc', 'trx', 'xrp'];
      const networks = ['mainnet', 'testnet'];

      for (const chain of chains) {
        for (const network of networks) {
          try {
            // Get current block height with timeout
            const currentBlock = await Promise.race<number>([
              this.getCurrentBlockHeight(chain, network),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000)
              )
            ]);

            if (typeof currentBlock === 'number' && currentBlock > 0) {
              currentBlocks[`${chain}_${network}`] = currentBlock;
            }

            // Get saved and last processed blocks
            const [savedBlock, lastProcessed] = await Promise.all([
              this.systemSettingsRepository.findOne({
                where: { key: `start_block_${chain}_${network}` }
              }),
              this.systemSettingsRepository.findOne({
                where: { key: `last_processed_block_${chain}_${network}` }
              })
            ]);

            if (savedBlock?.value) {
              savedBlocks[`${chain}_${network}`] = savedBlock.value;
            }
            if (lastProcessed?.value) {
              lastProcessedBlocks[`${chain}_${network}`] = lastProcessed.value;
            }

            this.logger.debug(`Block info for ${chain}_${network}:`, {
              currentBlock: currentBlocks[`${chain}_${network}`],
              savedBlock: savedBlocks[`${chain}_${network}`],
              lastProcessed: lastProcessedBlocks[`${chain}_${network}`]
            });

          } catch (error) {
            this.logger.error(`Error getting block info for ${chain}_${network}:`, error);
            // Skip this chain but continue with others
            continue;
          }
        }
      }

      // Return even if we only have partial data
      return {
        currentBlocks,
        savedBlocks,
        lastProcessedBlocks
      };
    } catch (error) {
      this.logger.error('Error in getBlockInfo:', error);
      throw error;
    }
  }

  private async updateLastProcessedBlock(chain: string, network: string, blockNumber: number) {
    try {
      const key = `last_processed_block_${chain}_${network}`;
      await this.systemSettingsRepository.upsert(
        {
          key,
          value: blockNumber.toString(),
        },
        ['key']
      );
      // Update local cache
      this.lastProcessedBlocks[`${chain}_${network}`] = blockNumber.toString();
      this.logger.debug(`Updated last processed block for ${chain} ${network} to ${blockNumber}`);
    } catch (error) {
      this.logger.error(`Failed to update last processed block for ${chain} ${network}:`, error);
      throw error;
    }
  }

  // Separate provider getters
  private getMonitoringProvider(chain: string, network: string) {
    const key = `${chain}_${network}`;
    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error(`No monitoring provider found for ${chain} ${network}`);
    }
    return provider;
  }

  private getInfoProvider(chain: string, network: string) {
    const key = `${chain}_${network}`;
    const provider = this.infoProviders[key];
    if (!provider) {
      throw new Error(`No info provider found for ${chain} ${network}`);
    }
    return provider;
  }

  // Use monitoring provider in processBlocks
  private async processBlocks(chain: string, network: string) {
    const provider = this.getMonitoringProvider(chain, network);
    const key = `${chain}_${network}`;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000; // 5 seconds
    
    while (this.isMonitoring[key]) {
        try {
            const currentBlock = await this.getCurrentBlockHeight(chain, network, provider);
            const lastProcessed = this.lastProcessedBlocks[key];
            const startBlock = lastProcessed ? parseInt(lastProcessed) + 1 : currentBlock;

            for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber++) {
                if (!this.isMonitoring[key]) break;
                
                try {
                    await this.processBlockWithRetry(chain, network, blockNumber, MAX_RETRIES);
                    retryCount = 0; // Reset retry count on success
                } catch (blockError) {
                    this.logger.error(`Error processing ${chain} ${network} block ${blockNumber}:`, blockError);
                    
                    if (blockError.code === 'TIMEOUT' || blockError.code === 'SERVER_ERROR') {
                        retryCount++;
                        if (retryCount >= MAX_RETRIES) {
                            this.logger.error(`Max retries reached for ${chain} ${network}, pausing monitoring`);
                            await this.stopChainMonitoring(chain, network);
                            break;
                        }
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                        blockNumber--; // Retry the same block
                        continue;
                    }
                    
                    await this.updateLastProcessedBlock(chain, network, blockNumber);
                }
            }
        } catch (error) {
            this.logger.error(`Error in ${chain} ${network} monitoring loop:`, error);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}

  private async processBlockWithRetry(chain: string, network: string, blockNumber: number, maxRetries: number) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Your existing block processing logic
        await this.updateLastProcessedBlock(chain, network, blockNumber);
        this.logger.debug(`Processed ${chain} ${network} block ${blockNumber}`);
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 5000 * (i + 1)));
      }
    }
  }

  // Add the getRpcUrl method
  private getRpcUrl(chain: string, network: string): string {
    switch (chain) {
      case 'eth':
        return this.configService.get(
          network === 'mainnet' ? 'ETHEREUM_MAINNET_RPC' : 'ETHEREUM_TESTNET_RPC'
        );
      case 'bsc':
        return this.configService.get(
          network === 'mainnet' ? 'BSC_MAINNET_RPC' : 'BSC_TESTNET_RPC'
        );
      case 'btc':
        return this.configService.get(
          network === 'mainnet' ? 'BITCOIN_MAINNET_RPC' : 'BITCOIN_TESTNET_RPC'
        );
      case 'trx':
        return this.configService.get(
          network === 'mainnet' ? 'TRON_MAINNET_API' : 'TRON_TESTNET_API'
        );
      case 'xrp':
        return this.configService.get(
          network === 'mainnet' ? 'XRP_MAINNET_RPC' : 'XRP_TESTNET_RPC'
        );
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }

  private async createProviderWithFallback(chain: string, network: string) {
    const primaryRpcUrl = this.getRpcUrl(chain, network);
    const fallbackRpcUrl = this.configService.get(`${chain.toUpperCase()}_${network.toUpperCase()}_RPC_FALLBACK`);
    
    if (!primaryRpcUrl) {
      throw new Error(`No RPC URL configured for ${chain} ${network}`);
    }

    try {
      switch (chain) {
        case 'eth':
        case 'bsc': {
          try {
            const provider = new JsonRpcProvider(primaryRpcUrl);
            await provider.getBlockNumber();
            this.logger.log(`Connected to primary RPC for ${chain} ${network}`);
            return provider;
          } catch (error) {
            if (fallbackRpcUrl) {
              this.logger.warn(`Primary RPC failed for ${chain} ${network}, trying fallback`);
              const fallbackProvider = new JsonRpcProvider(fallbackRpcUrl);
              await fallbackProvider.getBlockNumber();
              this.logger.log(`Connected to fallback RPC for ${chain} ${network}`);
              return fallbackProvider;
            }
            throw error;
          }
        }

        case 'btc': {
          try {
            const provider = {
              url: primaryRpcUrl,
              timeout: 30000,
              keepalive: true,
              requestOptions: {
                headers: { 'Content-Type': 'application/json' }
              }
            };
            await this.getBitcoinBlockHeight(provider);
            this.logger.log(`Connected to primary RPC for ${chain} ${network}`);
            return provider;
          } catch (error) {
            if (fallbackRpcUrl) {
              this.logger.warn(`Primary RPC failed for ${chain} ${network}, trying fallback`);
              const fallbackProvider = {
                url: fallbackRpcUrl,
                timeout: 30000,
                keepalive: true,
                requestOptions: {
                  headers: { 'Content-Type': 'application/json' }
                }
              };
              await this.getBitcoinBlockHeight(fallbackProvider);
              this.logger.log(`Connected to fallback RPC for ${chain} ${network}`);
              return fallbackProvider;
            }
            throw error;
          }
        }

        case 'trx': {
          try {
            const tronWeb = new TronWeb({
              fullHost: primaryRpcUrl,
              headers: { 
                "TRON-PRO-API-KEY": this.configService.get('TRON_API_KEY')
              }
            });
            await tronWeb.trx.getCurrentBlock();
            this.logger.log(`Connected to primary RPC for ${chain} ${network}`);
            return tronWeb;
          } catch (error) {
            if (fallbackRpcUrl) {
              this.logger.warn(`Primary RPC failed for ${chain} ${network}, trying fallback`);
              const fallbackTronWeb = new TronWeb({
                fullHost: fallbackRpcUrl,
                headers: { 
                  "TRON-PRO-API-KEY": this.configService.get('TRON_API_KEY')
                }
              });
              await fallbackTronWeb.trx.getCurrentBlock();
              this.logger.log(`Connected to fallback RPC for ${chain} ${network}`);
              return fallbackTronWeb;
            }
            throw error;
          }
        }

        case 'xrp': {
          try {
            const client = new Client(primaryRpcUrl);
            client.on('error', (error) => {
              this.logger.error(`XRP ${network} primary client error:`, error);
            });
            await client.connect();
            this.logger.log(`Connected to primary RPC for ${chain} ${network}`);
            return client;
          } catch (error) {
            if (fallbackRpcUrl) {
              this.logger.warn(`Primary RPC failed for ${chain} ${network}, trying fallback`);
              const fallbackClient = new Client(fallbackRpcUrl);
              fallbackClient.on('error', (error) => {
                this.logger.error(`XRP ${network} fallback client error:`, error);
              });
              await fallbackClient.connect();
              this.logger.log(`Connected to fallback RPC for ${chain} ${network}`);
              return fallbackClient;
            }
            throw error;
          }
        }

        default:
          throw new Error(`Unsupported chain: ${chain}`);
      }
    } catch (error) {
      this.logger.error(`Failed to connect to ${chain} ${network} RPC:`, error);
      throw error;
    }
  }

  // Add this method alongside other confirmation update methods
  private async updateBitcoinConfirmations(network: string, currentBlock: number) {
    try {
        const deposits = await this.depositRepository.find({
            where: {
          blockchain: 'btc',
                network: network,
                status: In(['pending', 'confirming']),
                blockNumber: Not(IsNull()),
            },
        });

        for (const deposit of deposits) {
        const oldStatus = deposit.status;
            const confirmations = currentBlock - deposit.blockNumber;
            const requiredConfirmations = this.CONFIRMATION_BLOCKS.btc[network];

            await this.depositRepository.update(deposit.id, {
                confirmations,
                status: confirmations >= requiredConfirmations ? 'confirmed' : 'confirming'
            });

        if (oldStatus !== 'confirmed' && confirmations >= requiredConfirmations) {
          const wallet = await this.walletRepository.findOne({
            where: { id: deposit.walletId }
          });
          
          if (wallet) {
            const user = await this.userRepository.findOne({
              where: { id: wallet.userId }
            });

            if (user?.email && user.notificationSettings?.Wallet?.Deposits) {
              await this.emailService.sendDepositConfirmedEmail(
                user.email,
                user.fullName,
                this.formatAmount(deposit.amount),
                'BTC'
              );
            }
          }

                await this.updateWalletBalance(deposit);
                this.logToFile(`Updated wallet balance for deposit ${deposit.id}`);
            }
        }
    } catch (error) {
        this.logger.error(`Error updating Bitcoin confirmations: ${error.message}`);
    }
}

  // Add XRP Confirmation Update
  private async updateXrpConfirmations(network: string, currentBlock: number) {
    try {
        const deposits = await this.depositRepository.find({
            where: {
                blockchain: 'xrp',
                network: network,
                status: In(['pending', 'confirming']),
                blockNumber: Not(IsNull()),
            },
        });

        for (const deposit of deposits) {
        const oldStatus = deposit.status;
            const confirmations = currentBlock - deposit.blockNumber;
            const requiredConfirmations = this.CONFIRMATION_BLOCKS.xrp[network];

            await this.depositRepository.update(deposit.id, {
                confirmations,
                status: confirmations >= requiredConfirmations ? 'confirmed' : 'confirming'
            });

        if (oldStatus !== 'confirmed' && confirmations >= requiredConfirmations) {
          const wallet = await this.walletRepository.findOne({
            where: { id: deposit.walletId }
          });
          
          if (wallet) {
            const user = await this.userRepository.findOne({
              where: { id: wallet.userId }
            });

            if (user?.email && user.notificationSettings?.Wallet?.Deposits) {
              await this.emailService.sendDepositConfirmedEmail(
                user.email,
                user.fullName,
                this.formatAmount(deposit.amount),
                'XRP'
              );
            }
          }

                await this.updateWalletBalance(deposit);
            }
        }
    } catch (error) {
        this.logger.error(`Error updating XRP confirmations: ${error.message}`);
    }
}

  private formatAmount(amount: string): string {
    // Remove trailing zeros after decimal point and unnecessary decimal point
    return amount.replace(/\.?0+$/, '');
  }

  private getEvmProvider(blockchain: string, network: string): providers.Provider {
    this.logToFile(`[getEvmProvider] Called with blockchain: ${blockchain}, network: ${network}`);
    
    // Map all EVM blockchain names to provider key format
    const evmMappings: Record<string, string> = {
        'ethereum': 'eth',
        'binance-smart-chain': 'bsc',
        'binance': 'bsc'
    };
    
    const chainKey = evmMappings[blockchain] || blockchain;
    const key = `${chainKey}_${network}`;
    
    this.logToFile(`[getEvmProvider] Looking up provider with key: ${key} (mapped from ${blockchain})`);
    
    const provider = this.providers.get(key) as providers.Provider;
    if (!provider) {
        this.logToFile(`[getEvmProvider] Available provider keys: ${Array.from(this.providers.keys()).join(', ')}`);
        throw new Error(`No provider found for ${blockchain} ${network}`);
    }
    
    this.logToFile(`[getEvmProvider] Successfully found provider for ${key}`);
    return provider;
}
}
