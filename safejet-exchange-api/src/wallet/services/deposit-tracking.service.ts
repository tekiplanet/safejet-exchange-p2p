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
} from 'ethers';
import { WebSocketProvider, JsonRpcProvider } from '@ethersproject/providers';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from 'decimal.js';
import { In, Not, IsNull, Like } from 'typeorm';
import * as bitcoin from 'bitcoinjs-lib';
const TronWeb = require('tronweb');
type TronWebType = typeof TronWeb;
type TronWebInstance = InstanceType<TronWebType>;
import { Client } from 'xrpl';
type XrplClient = Client;

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
      testnet: 5
    },
    bsc: {
      mainnet: 15,
      testnet: 6
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
      checkInterval: this.configService.get('ETHEREUM_CHECK_INTERVAL', 30000)
    },
    bsc: {
      blockDelay: this.configService.get('BSC_BLOCK_DELAY', 1000),
      checkInterval: this.configService.get('BSC_CHECK_INTERVAL', 30000)
    },
    bitcoin: {
      blockDelay: this.configService.get('BITCOIN_BLOCK_DELAY', 1000),
      checkInterval: this.configService.get('BITCOIN_CHECK_INTERVAL', 30000)
    },
    trx: {
      blockDelay: this.configService.get('TRON_BLOCK_DELAY', 1000),
      checkInterval: this.configService.get('TRON_CHECK_INTERVAL', 30000)
    },
    xrp: {
      blockDelay: this.configService.get('XRP_BLOCK_DELAY', 1000),
      checkInterval: this.configService.get('XRP_CHECK_INTERVAL', 30000)
    }
  };

  private readonly CHAIN_KEYS = {
    eth: 'eth',
    bsc: 'bsc',
    bitcoin: 'btc',
    trx: 'trx',
    xrp: 'xrp'
  } as const;

  private blockQueues: {
    [key: string]: {
        queue: number[];
    };
  } = {};

  private processingLocks = new Map<string, boolean>();

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
  ) {}

  async onModuleInit() {
    ['eth_mainnet', 'eth_testnet', 'bsc_mainnet', 'bsc_testnet'].forEach(chain => {
        this.blockQueues[chain] = {
            queue: []
        };
    });
    
    await this.initializeProviders();
    // Remove automatic start of monitoring
    // await this.startMonitoring();
  }

  private async initializeProviders() {
    // Initialize EVM providers (Ethereum, BSC)
    const evmNetworks = {
      eth: {
        mainnet: this.configService.get('ETHEREUM_MAINNET_RPC'),
        testnet: this.configService.get('ETHEREUM_TESTNET_RPC'),
      },
      bsc: {
        mainnet: this.configService.get('BSC_MAINNET_RPC'),
        testnet: this.configService.get('BSC_TESTNET_RPC'),
      }
    };

    // Setup EVM providers
    for (const [chain, networks] of Object.entries(evmNetworks)) {
      for (const [network, rpcUrl] of Object.entries(networks)) {
        const providerKey = `${chain}_${network}`;
        if (typeof rpcUrl === 'string') {
          try {
            let provider: JsonRpcProvider | WebSocketProvider;
            if (rpcUrl.startsWith('ws')) {
              provider = new WebSocketProvider(rpcUrl);
            } else {
              provider = new JsonRpcProvider(rpcUrl);
            }
            
            const blockNumber = await provider.getBlockNumber();
            this.providers.set(providerKey, provider);
            this.logger.log(`${chain.toUpperCase()} ${network} provider initialized successfully, current block: ${blockNumber}`);
          } catch (error) {
            this.logger.error(`Failed to initialize ${chain.toUpperCase()} ${network} provider: ${error.message}`);
          }
        }
      }
    }

    // Initialize Bitcoin provider
    const bitcoinNetworks = {
      mainnet: this.configService.get('BITCOIN_MAINNET_RPC'),
      testnet: this.configService.get('BITCOIN_TESTNET_RPC'),
    };

    for (const [network, rpcUrl] of Object.entries(bitcoinNetworks)) {
      const providerKey = `btc_${network}`;
      try {
        const provider = {
          url: rpcUrl,
          auth: {
            username: this.configService.get('BITCOIN_RPC_USER'),
            password: this.configService.get('BITCOIN_RPC_PASS'),
          }
        } as BitcoinProvider;

        // Test connection
        const blockCount = await this.bitcoinRpcCall(provider, 'getblockcount', []);
        this.providers.set(providerKey, provider);
        this.logger.log(`Bitcoin ${network} provider initialized successfully, current block: ${blockCount}`);
      } catch (error) {
        this.logger.error(`Failed to initialize Bitcoin ${network} provider: ${error.message}`);
      }
    }

    // Initialize TRON provider
    const tronNetworks = {
      mainnet: this.configService.get('TRON_MAINNET_API'),
      testnet: this.configService.get('TRON_TESTNET_API'),
    };

    for (const [network, apiUrl] of Object.entries(tronNetworks)) {
      const providerKey = `trx_${network}`;
      
      try {
        const apiKey = this.configService.get('TRON_API_KEY');
        if (!apiKey) {
          this.logger.error('TRON_API_KEY not found in environment variables');
          continue;
        }

        // Create TronWeb instance
        const tronWeb = new TronWeb({
          fullNode: apiUrl,
          solidityNode: apiUrl,
          eventServer: apiUrl,
          privateKey: '', // Empty for read-only
          headers: {
            "TRON-PRO-API-KEY": apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        });

        // Test connection before setting provider
        const block = await tronWeb.trx.getCurrentBlock();
        if (!block) {
          throw new Error('Could not fetch current block');
        }

        this.providers.set(providerKey, tronWeb);
        this.logger.log(`TRON ${network} provider initialized successfully, current block: ${block.block_header.raw_data.number}`);
      } catch (error) {
        this.logger.error(`Failed to initialize TRON ${network} provider: ${error.message}`);
      }
    }

    // Initialize XRP provider
    const xrpNetworks = {
      mainnet: this.configService.get('XRP_MAINNET_RPC'),
      testnet: this.configService.get('XRP_TESTNET_RPC'),
    };

    for (const [network, rpcUrl] of Object.entries(xrpNetworks)) {
      const providerKey = `xrp_${network}`;
      try {
        const provider = new Client(rpcUrl);
        await provider.connect();
        const info = await provider.request({
          command: 'server_info'
        });
        this.providers.set(providerKey, provider);
        this.logger.log(`XRP ${network} provider initialized successfully, current block: ${info.result.info.validated_ledger.seq}`);
      } catch (error) {
        this.logger.error(`Failed to initialize XRP ${network} provider: ${error.message}`);
      }
    }
  }

  async startMonitoring() {
    if (this.monitoringActive) {
      throw new Error('Monitoring is already running');
    }

    this.shouldStop = false;
    this.monitoringActive = true;

    // Start all chains
    for (const chain of Object.keys(this.chainMonitoringStatus)) {
      for (const network of Object.keys(this.chainMonitoringStatus[chain])) {
        this.chainMonitoringStatus[chain][network] = true;
        await this.startChainMonitoring(chain, network);
      }
    }

    return true;
  }

  async stopMonitoring() {
    if (!this.monitoringActive) {
      throw new Error('Monitoring is not running');
    }

    this.shouldStop = true;
    this.monitoringActive = false;

    // Stop all chains
    for (const chain of Object.keys(this.chainMonitoringStatus)) {
      for (const network of Object.keys(this.chainMonitoringStatus[chain])) {
        this.chainMonitoringStatus[chain][network] = false;
        await this.stopChainMonitoring(chain, network);
      }
    }

    // Clear all EVM listeners
    for (const [providerKey, listener] of this.evmBlockListeners.entries()) {
      const provider = this.providers.get(providerKey);
      if (provider) {
        provider.removeListener('block', listener);
      }
    }
    this.evmBlockListeners.clear();

    return true;
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
    try {
      const providerKey = `${chain}_${network}`;
      const provider = this.providers.get(providerKey) as providers.Provider;
      
      if (!provider) {
        this.logger.warn(`No provider found for ${chain} ${network}`);
        return false;
      }

      // Clear any existing interval and listener
      if (this.evmBlockListeners.has(providerKey)) {
        const oldListener = this.evmBlockListeners.get(providerKey);
        provider.removeListener('block', oldListener);
        this.evmBlockListeners.delete(providerKey);
      }

      // Set monitoring status
      if (!this.chainMonitoringStatus[chain]) {
        this.chainMonitoringStatus[chain] = {};
      }
      this.chainMonitoringStatus[chain][network] = true;

      // Get initial block height if not provided
      if (!startBlock) {
        startBlock = await this.getCurrentBlockHeight(chain, network);
      }

      this.logger.log(`Started monitoring ${chain} ${network} blocks from block ${startBlock}`);

      // Create block listener
      const blockListener = async (blockNumber: number) => {
        if (!this.chainMonitoringStatus[chain]?.[network]) {
          provider.removeListener('block', blockListener);
          return;
        }

        try {
          await this.processEvmBlock(chain, network, blockNumber, provider);
          await this.updateLastProcessedBlock(chain, network, blockNumber);
          this.logger.debug(`Processed ${chain} ${network} block ${blockNumber}`);
        } catch (error) {
          this.logger.error(`Error processing ${chain} ${network} block ${blockNumber}:`, error);
        }
      };

      // Start listening for new blocks
      provider.on('block', blockListener);
      this.evmBlockListeners.set(providerKey, blockListener);

      return true;
    } catch (error) {
      this.logger.error(`Failed to start ${chain} ${network} monitoring:`, error);
      this.chainMonitoringStatus[chain][network] = false;
      return false;
    }
  }

  private async processQueueForChain(chain: string, network: string, provider: any) {
    const queueKey = `${chain}_${network}`;
    const queue = this.blockQueues[queueKey];

    try {
      while (queue.queue.length > 0) {
        // Check monitoring status inside the loop
        if (!this.chainMonitoringStatus[chain][network]) {
          break;
        }

        const blockNumber = queue.queue.shift()!;
        try {
          await this.processEvmBlock(chain, network, blockNumber, provider);
          await new Promise(resolve => setTimeout(resolve, this.PROCESSING_DELAYS[chain].blockDelay));
        } catch (error) {
          this.logger.error(`Error processing ${chain} ${network} block ${blockNumber}: ${error.message}`);
        }
      }
    } finally {
      // Only continue if still monitoring and have blocks to process
      if (queue.queue.length > 0 && this.chainMonitoringStatus[chain][network]) {
        setImmediate(() => this.processQueueForChain(chain, network, provider));
      }
    }
  }

  private async processEvmBlock(chain: string, network: string, blockNumber: number, provider: providers.Provider) {
    try {
      // Get block with transactions
      const block = await provider.getBlock(blockNumber);
      if (!block) return;

      // Get transaction details
      const txPromises = block.transactions.map(txHash => 
        this.getEvmTransactionWithRetry(provider, txHash)
      );
      
      const transactions = await Promise.all(txPromises);
      this.logger.log(`${chain} ${network}: Processing block ${blockNumber} with ${transactions.length} transactions`);

      // Process each transaction
      for (const tx of transactions) {
        if (tx) {
          try {
            await this.processEvmTransaction(chain, network, tx);
          } catch (error) {
            this.logger.error(`Error processing transaction ${tx.hash}: ${error.message}`);
            // Continue processing other transactions
            continue;
          }
        }
      }

      // Update last processed block after successful processing
      await this.updateLastProcessedBlock(chain, network, blockNumber);
      
    } catch (error) {
      this.logger.error(`Error processing ${chain} ${network} block ${blockNumber}:`, error);
      throw error;
    }
  }

  private async updateEvmConfirmations(chain: string, network: string, currentBlock: number) {
    try {
      const chainKey = this.CHAIN_KEYS[chain] || chain;
      const deposits = await this.depositRepository.find({
        where: {
          blockchain: chain,
          network: network,
          status: In(['pending', 'confirming']),
          blockNumber: Not(IsNull()),
        },
      });

      for (const deposit of deposits) {
        const confirmations = currentBlock - deposit.blockNumber;
        const requiredConfirmations = this.CONFIRMATION_BLOCKS[chainKey][network];

        await this.depositRepository.update(deposit.id, {
          confirmations,
          status: confirmations >= requiredConfirmations ? 'confirmed' : 'confirming'
        });

        if (confirmations >= requiredConfirmations && deposit.status !== 'confirmed') {
          await this.updateWalletBalance(deposit);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating ${chain} confirmations: ${error.message}`);
    }
  }

  private async processEvmTransaction(
    chain: string,
    network: string,
    tx: providers.TransactionResponse
  ) {
    try {
      // Get all user wallets for this chain/network
      const wallets = await this.walletRepository.find({
        where: {
          blockchain: chain,
          network: network,
        },
      });

      // Create a map of addresses to wallet IDs for quick lookup
      const walletMap = new Map(wallets.map(w => [w.address.toLowerCase(), w]));

      // Check if transaction is to one of our wallets
      const toAddress = tx.to?.toLowerCase();
      if (!toAddress || !walletMap.has(toAddress)) return;

      const wallet = walletMap.get(toAddress);
      
      // Get token for this transaction
      const token = await this.getTokenForTransaction(chain, tx);
      if (!token) return;

      // Get amount based on token type
      const amount = await this.getTransactionAmount(tx, token);
      if (!amount) return;

      // Create deposit record
      await this.depositRepository.save({
        userId: wallet.userId,
        walletId: wallet.id,
        tokenId: token.id,
        txHash: tx.hash,
        amount: amount,
        blockchain: chain,
        network: network,
        networkVersion: token.networkVersion,
        blockNumber: tx.blockNumber,
        status: 'pending',
        metadata: {
          from: tx.from,
          contractAddress: token.contractAddress,
          blockHash: tx.blockHash,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmations: 0
      });

    } catch (error) {
      this.logger.error(`Error processing transaction ${tx.hash}: ${error.message}`);
    }
  }

  private async getTokenForTransaction(chain: string, tx: providers.TransactionResponse): Promise<Token | null> {
    try {
      if (!tx.to) return null;

      // For native token transfers
      if (!tx.data || tx.data === '0x') {
        return this.tokenRepository.findOne({
          where: {
            blockchain: chain,
            networkVersion: 'NATIVE',
            isActive: true
          }
        });
      }

      // For token transfers
      return this.tokenRepository.findOne({
        where: {
          blockchain: chain,
          contractAddress: tx.to.toLowerCase(),
          isActive: true
        }
      });

    } catch (error) {
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
          type: 'spot'
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
    // this.logger.debug(`Received block data: ${JSON.stringify(block, null, 2)}`);
    
    if (!block || !block.tx) {
        this.logger.warn(`Skipping invalid Bitcoin block for ${chain} ${network}: ${JSON.stringify(block)}`);
        return;
    }

    try {
        this.logger.log(`${chain} ${network}: Processing block ${block.height} with ${block.tx.length} transactions`);
        
        // Process transactions
    for (const tx of block.tx) {
            await this.processBitcoinTransaction(chain, network, tx);
        }

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

  private async getBitcoinBlockHeight(provider: BitcoinProvider): Promise<number> {
    try {
      const response = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${provider.auth.username}:${provider.auth.password}`).toString('base64')
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getblockcount',
          params: [],
          id: 1
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(`Bitcoin RPC error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      this.logger.error(`Error getting Bitcoin block height: ${error.message}`);
      throw error;
    }
  }

  private async getBitcoinBlock(provider: BitcoinProvider, blockNumber: number): Promise<BitcoinBlock> {
    try {
      // First get block hash
      const hashResponse = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${provider.auth.username}:${provider.auth.password}`).toString('base64')
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getblockhash',
          params: [blockNumber],
          id: 1
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
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${provider.auth.username}:${provider.auth.password}`).toString('base64')
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getblock',
          params: [hashData.result, 2], // Verbosity level 2 for full transaction details
          id: 1
        })
      });

      const blockData = await blockResponse.json();
      if (blockData.error) {
        throw new Error(`Bitcoin RPC error: ${blockData.error.message}`);
      }

      return blockData.result;
    } catch (error) {
      this.logger.error(`Error getting Bitcoin block ${blockNumber}: ${error.message}`);
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
      // Get all TRON wallets
      const wallets = await this.walletRepository.find({
        where: {
          blockchain: 'trx',
          network,
        },
      });

      const walletAddresses = new Set(wallets.map(w => w.address));
      const tronWeb = this.providers.get(`trx_${network}`) as TronWebInstance;

      // Process each transaction
      for (const tx of block.transactions || []) {
        if (tx.raw_data?.contract?.[0]?.type === 'TransferContract' || 
            tx.raw_data?.contract?.[0]?.type === 'TransferAssetContract') {
          
          const contract = tx.raw_data.contract[0];
          const parameter = contract.parameter.value;
          const toAddress = tronWeb.address.fromHex(parameter.to_address);

          if (walletAddresses.has(toAddress)) {
            const wallet = wallets.find(w => w.address === toAddress);
            const token = await this.getTronToken(contract.type, parameter.asset_name);

            if (token) {
              await this.depositRepository.save({
                userId: wallet.userId,
                walletId: wallet.id,
                tokenId: token.id,
                txHash: tx.txID,
                amount: (parameter.amount / Math.pow(10, token.decimals)).toString(),
                blockchain: 'trx',
                network,
                networkVersion: token.networkVersion,
                blockNumber: block.block_header.raw_data.number,
                status: 'pending',
                metadata: {
                  from: tronWeb.address.fromHex(parameter.owner_address),
                  contractAddress: token.contractAddress,
                  blockHash: block.blockID,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                confirmations: 0
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing TRON block: ${error.message}`);
    }
  }

  private async updateTronConfirmations(network: string, currentBlock: number) {
    try {
      const deposits = await this.depositRepository.find({
        where: {
          blockchain: 'trx',
          network,
          status: In(['pending', 'confirming']),
          blockNumber: Not(IsNull()),
        },
      });

      for (const deposit of deposits) {
        const confirmations = currentBlock - deposit.blockNumber;
        const requiredConfirmations = this.CONFIRMATION_BLOCKS.trx[network];

        await this.depositRepository.update(deposit.id, {
          confirmations,
          status: confirmations >= requiredConfirmations ? 'confirmed' : 'confirming'
        });

        if (confirmations >= requiredConfirmations && deposit.status !== 'confirmed') {
          await this.updateWalletBalance(deposit);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating TRON confirmations: ${error.message}`);
    }
  }

  private async getTronToken(contractType: string, assetName?: string): Promise<Token | null> {
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
          networkVersion: 'TRC20',
          symbol: assetName,
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
        // Get all Bitcoin wallets
        const wallets = await this.walletRepository.find({
            where: {
                blockchain: chain,
                network: network,
            },
        });

        const walletAddresses = new Set(wallets.map(w => w.address));

        // Process each output
        for (const output of tx.vout) {
            const addresses = output.scriptPubKey.addresses || [];
            
            for (const address of addresses) {
                if (walletAddresses.has(address)) {
                    const wallet = wallets.find(w => w.address === address);
                    if (!wallet) continue;

                    const tokenId = await this.getBitcoinTokenId();
                    
                    // Create deposit record with correct types
                    await this.depositRepository.save({
                        userId: wallet.userId.toString(), // Convert to string if needed
                        walletId: wallet.id.toString(), // Convert to string if needed
                        tokenId: tokenId.toString(), // Convert to string as per entity definition
                        txHash: tx.txid,
                        amount: output.value.toString(),
                        blockchain: chain,
                        network: network,
                        networkVersion: 'NATIVE',
                        blockNumber: tx.blockHeight,
                        status: 'pending',
                        metadata: {
                            from: tx.vin[0]?.scriptSig?.addresses?.[0] || 'unknown',
                            blockHash: tx.blockHash,
                        },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        confirmations: 0
                    });

                    this.logger.debug(`Created deposit record for Bitcoin transaction ${tx.txid} to address ${address}`);
                }
            }
        }
    } catch (error) {
        this.logger.error(`Error processing Bitcoin transaction: ${error.message}`);
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
      const provider = this.providers.get(`xrp_${network}`) as Client;
      if (!provider) return;

      await provider.connect();
      const serverInfo = await provider.request({ command: 'server_info' });
      const currentLedger = serverInfo.result.info.validated_ledger.seq;
      let lastProcessedBlock = startBlock || await this.getLastProcessedBlock('xrp', network);

      for (let ledgerIndex = lastProcessedBlock + 1; ledgerIndex <= currentLedger; ledgerIndex++) {
        if (!this.chainMonitoringStatus['xrp'][network]) break;

        try {
          await this.processXrpLedger('xrp', network, ledgerIndex);
          // Update last processed block after each successful ledger
          await this.updateLastProcessedBlock('xrp', network, ledgerIndex);
        } catch (error) {
          if (!error.message.includes('ledgerNotFound')) {
            this.logger.error(`Error processing XRP ledger ${ledgerIndex}:`, error);
            break;
          }
        }
      }
    } finally {
      this.releaseLock('xrp', network);
    }
  }

  private async processXrpLedger(chain: string, network: string, ledgerIndex: number) {
    try {
        const provider = this.providers.get(`xrp_${network}`) as Client;
        
        // Get ledger with transactions
        const ledgerResponse = await provider.request({
            command: 'ledger',
            ledger_index: ledgerIndex,
            transactions: true,
            expand: true
        });
        
        const transactions = ledgerResponse.result.ledger.transactions || [];
        this.logger.log(`XRP ${network}: Processing ledger ${ledgerIndex} with ${transactions.length} transactions`);

        for (const tx of transactions) {
            await this.processXrpTransaction(chain, network, tx);
        }

        this.logger.log(`XRP ${network}: Completed ledger ${ledgerIndex}`);
    } catch (error) {
        this.logger.error(`Error processing XRP ledger ${ledgerIndex}: ${error.message}`);
    }
  }

  private async processXrpTransaction(chain: string, network: string, tx: any) {
    try {
      if (tx.TransactionType !== 'Payment') return;

      const wallets = await this.walletRepository.find({
        where: {
          blockchain: chain,
          network: network,
        },
      });

      const walletAddresses = new Set(wallets.map(w => w.address));

      if (walletAddresses.has(tx.Destination)) {
        const wallet = wallets.find(w => w.address === tx.Destination);
        if (!wallet) return;

        const tokenId = await this.getXrpTokenId();

        await this.depositRepository.save({
          userId: wallet.userId.toString(),
          walletId: wallet.id.toString(),
          tokenId: tokenId.toString(),
          txHash: tx.hash,
          amount: tx.Amount,
          blockchain: chain,
          network: network,
          networkVersion: 'NATIVE',
          blockNumber: tx.ledger_index,
          status: 'pending',
          metadata: {
            from: tx.Account,
            blockHash: tx.ledger_hash,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          confirmations: 0
        });
      }
    } catch (error) {
      this.logger.error(`Error processing XRP transaction: ${error.message}`);
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

  async getCurrentBlockHeight(chain: string, network: string): Promise<number> {
    try {
      const provider = this.providers.get(`${chain}_${network}`);
      if (!provider) {
        throw new Error(`No provider found for ${chain} ${network}`);
      }

      switch (chain) {
        case 'eth':
        case 'bsc':
          return await provider.getBlockNumber();
        
        case 'btc':
          return await this.getBitcoinBlockHeight(provider);
        
        case 'trx':
          const block = await provider.trx.getCurrentBlock();
          return block.block_header.raw_data.number;
        
        case 'xrp':
          try {
            await (provider as Client).connect();
            const serverInfo = await (provider as Client).request({
              command: 'server_info'
            });
            if (!serverInfo?.result?.info?.validated_ledger?.seq) {
              throw new Error('Invalid XRP server response');
            }
            return serverInfo.result.info.validated_ledger.seq;
          } catch (xrpError) {
            this.logger.error(`XRP ${network} connection error: ${xrpError.message}`);
            return 0; // Return 0 for XRP when connection fails
          }
        
        default:
          throw new Error(`Unsupported chain: ${chain}`);
      }
    } catch (error) {
      this.logger.error(`Error getting current block height for ${chain} ${network}: ${error.message}`);
      return 0; // Return 0 for any chain that fails
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

      this.logger.log(`Started monitoring ${chain} ${network} from block ${blockNumber}`);
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
    // First clear any existing interval
    if (network === 'mainnet' && this.btcMainnetInterval) {
      clearInterval(this.btcMainnetInterval);
      this.btcMainnetInterval = null;
    } else if (network === 'testnet' && this.btcTestnetInterval) {
      clearInterval(this.btcTestnetInterval);
      this.btcTestnetInterval = null;
    }

    const provider = this.providers.get(`btc_${network}`);
    if (!provider) {
      this.logger.warn(`No Bitcoin provider found for network ${network}`);
      return false;
    }

    try {
      // Set monitoring status
      if (!this.chainMonitoringStatus['btc']) {
        this.chainMonitoringStatus['btc'] = {};
      }
      this.chainMonitoringStatus['btc'][network] = true;

      // Get initial block height if not provided
      if (!startBlock) {
        startBlock = await this.getCurrentBlockHeight('btc', network);
      }

      this.logger.log(`Started monitoring Bitcoin ${network} blocks from block ${startBlock}`);

      // Start the monitoring interval
      const interval = setInterval(async () => {
        if (!this.chainMonitoringStatus['btc']?.[network]) {
          clearInterval(interval);
          return;
        }

        try {
          const currentHeight = await this.getBitcoinBlockHeight(provider);
          const lastProcessed = await this.getLastProcessedBlock('btc', network);

          // Process new blocks
          for (let height = lastProcessed + 1; height <= currentHeight; height++) {
            if (!this.chainMonitoringStatus['btc']?.[network]) break;

            const block = await this.getBitcoinBlock(provider, height);
            if (block) {
              await this.processBitcoinBlock('btc', network, block);
              await this.updateLastProcessedBlock('btc', network, height);
              this.logger.debug(`Processed Bitcoin ${network} block ${height}`);
            }
          }
        } catch (error) {
          this.logger.error(`Error in Bitcoin ${network} monitoring:`, error);
        }
      }, this.PROCESSING_DELAYS.bitcoin.checkInterval);

      if (network === 'mainnet') {
        this.btcMainnetInterval = interval;
      } else {
        this.btcTestnetInterval = interval;
      }

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

      // Get initial block height if not provided
      if (!startBlock) {
        startBlock = await this.getCurrentBlockHeight('trx', network);
      }

      this.logger.log(`Started monitoring TRON ${network} blocks from block ${startBlock}`);

      // Start the monitoring interval
      const interval = setInterval(async () => {
        if (!this.chainMonitoringStatus['trx']?.[network]) {
          clearInterval(interval);
          return;
        }

        try {
          const latestBlock = await tronWeb.trx.getCurrentBlock();
          const currentBlockNumber = latestBlock.block_header.raw_data.number;
          const lastProcessed = await this.getLastProcessedBlock('trx', network);

          // Process new blocks
          for (let height = lastProcessed + 1; height <= currentBlockNumber; height++) {
            if (!this.chainMonitoringStatus['trx']?.[network]) break;

            const block = await this.getTronBlockWithRetry(tronWeb, height, 3);
            if (block) {
              await this.processTronBlock(network, block);
              await this.updateLastProcessedBlock('trx', network, height);
              this.logger.debug(`Processed TRON ${network} block ${height}`);
            }
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
      // Set monitoring status
      if (!this.chainMonitoringStatus['xrp']) {
        this.chainMonitoringStatus['xrp'] = {};
      }
      this.chainMonitoringStatus['xrp'][network] = true;

      // Get initial block height if not provided
      if (!startBlock) {
        startBlock = await this.getCurrentBlockHeight('xrp', network);
      }

      this.logger.log(`Started monitoring XRP ${network} blocks from block ${startBlock}`);

      // Start the monitoring interval
      const interval = setInterval(async () => {
        if (!this.chainMonitoringStatus['xrp']?.[network]) {
          clearInterval(interval);
          return;
        }

        try {
          await provider.connect();
          const serverInfo = await provider.request({ command: 'server_info' });
          const currentLedger = serverInfo.result.info.validated_ledger.seq;
          const lastProcessed = await this.getLastProcessedBlock('xrp', network);

          // Process new blocks
          for (let ledgerIndex = lastProcessed + 1; ledgerIndex <= currentLedger; ledgerIndex++) {
            if (!this.chainMonitoringStatus['xrp']?.[network]) break;

            try {
              await this.processXrpLedger('xrp', network, ledgerIndex);
              await this.updateLastProcessedBlock('xrp', network, ledgerIndex);
              this.logger.debug(`Processed XRP ${network} ledger ${ledgerIndex}`);
            } catch (error) {
              if (!error.message.includes('ledgerNotFound')) {
                this.logger.error(`Error processing XRP ledger ${ledgerIndex}:`, error);
                break;
              }
            }
          }
        } catch (error) {
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
}