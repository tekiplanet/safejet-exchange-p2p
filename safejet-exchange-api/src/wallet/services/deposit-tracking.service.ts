import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deposit } from '../entities/deposit.entity';
import { WalletBalance } from '../entities/wallet-balance.entity';
import { Token } from '../entities/token.entity';
import { Wallet } from '../entities/wallet.entity';
import { 
  providers,
  Contract,
  utils,
} from 'ethers';
import { WebSocketProvider, JsonRpcProvider } from '@ethersproject/providers';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from 'decimal.js';
import { In, Not, IsNull } from 'typeorm';
import * as bitcoin from 'bitcoinjs-lib';
import { TronWeb } from 'tronweb';

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
  [key: string]: JsonRpcProvider | WebSocketProvider | BitcoinProvider | TronWeb;
}

@Injectable()
export class DepositTrackingService implements OnModuleInit {
  private readonly logger = new Logger(DepositTrackingService.name);
  private readonly providers = new Map<string, Providers[string]>();
  private readonly CONFIRMATION_BLOCKS = {
    ethereum: {
      mainnet: 12,
      testnet: 5
    },
    bsc: {
      mainnet: 15,
      testnet: 6
    },
    bitcoin: {
      mainnet: 3,
      testnet: 2
    },
    trx: {
      mainnet: 20,
      testnet: 10
    }
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
  ) {}

  async onModuleInit() {
    await this.initializeProviders();
    await this.startMonitoring();
  }

  private async initializeProviders() {
    // Initialize EVM providers (Ethereum, BSC)
    const evmNetworks = {
      ethereum: {
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
          // Check if it's a WebSocket URL
          if (rpcUrl.startsWith('ws')) {
            this.providers.set(providerKey, new WebSocketProvider(rpcUrl));
          } else {
            this.providers.set(providerKey, new JsonRpcProvider(rpcUrl));
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
      const providerKey = `bitcoin_${network}`;
      this.providers.set(providerKey, {
        url: rpcUrl,
        auth: {
          username: this.configService.get('BITCOIN_RPC_USER'),
          password: this.configService.get('BITCOIN_RPC_PASS'),
        }
      } as BitcoinProvider);
    }

    // Initialize TRON provider
    const tronNetworks = {
      mainnet: this.configService.get('TRON_MAINNET_API'),
      testnet: this.configService.get('TRON_TESTNET_API'),
    };

    for (const [network, apiUrl] of Object.entries(tronNetworks)) {
      const providerKey = `trx_${network}`;
      this.providers.set(providerKey, new TronWeb({
        fullHost: apiUrl,
        headers: { "TRON-PRO-API-KEY": this.configService.get('TRON_API_KEY') },
      }));
    }
  }

  private async startMonitoring() {
    // Start monitoring for each chain
    await Promise.all([
      this.monitorEvmChains(),
      this.monitorBitcoin(),
      this.monitorTron(),
      // Add other chains
    ]);
  }

  private async monitorEvmChains() {
    for (const [providerKey, provider] of this.providers.entries()) {
      const [chain, network] = providerKey.split('_');
      if (['ethereum', 'bsc'].includes(chain)) {
        // Monitor new blocks
        provider.on('block', async (blockNumber: number) => {
          await this.handleEvmBlock(chain, network, blockNumber, provider);
        });
      }
    }
  }

  private async handleEvmBlock(
    chain: string,
    network: string,
    blockNumber: number,
    provider: JsonRpcProvider | WebSocketProvider
  ) {
    try {
      const block = await provider.getBlock(blockNumber);
      if (!block) return;

      const txPromises = block.transactions.map(txHash => 
        provider.getTransaction(txHash)
      );
      const transactions = await Promise.all(txPromises);

      for (const tx of transactions) {
        if (tx) {
          await this.processEvmTransaction(chain, network, tx);
        }
      }

      await this.updateEvmConfirmations(chain, network, blockNumber);
    } catch (error) {
      this.logger.error(`Error processing ${chain} block ${blockNumber}: ${error.message}`);
    }
  }

  private async updateEvmConfirmations(chain: string, network: string, currentBlock: number) {
    try {
      // Get pending/confirming deposits for this chain/network
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
        const requiredConfirmations = this.CONFIRMATION_BLOCKS[chain][network];

        await this.depositRepository.update(deposit.id, {
          confirmations,
          status: confirmations >= requiredConfirmations ? 'confirmed' : 'confirming'
        });

        // If deposit is now confirmed, update wallet balance
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
        }
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
      const provider = this.providers.get(`bitcoin_${network}`);
      
      // Start monitoring new blocks
      setInterval(async () => {
        try {
          await this.checkBitcoinBlocks(network, provider);
        } catch (error) {
          this.logger.error(`Error checking Bitcoin ${network} blocks: ${error.message}`);
        }
      }, 60000); // Check every minute
    }
  }

  private async checkBitcoinBlocks(network: string, provider: any) {
    try {
      // Get latest block
      const blockCount = await this.bitcoinRpcCall(provider, 'getblockcount', []);
      const lastProcessedBlock = await this.getLastProcessedBlock('bitcoin', network);

      // Process new blocks
      for (let height = lastProcessedBlock + 1; height <= blockCount; height++) {
        const blockHash = await this.bitcoinRpcCall(provider, 'getblockhash', [height]);
        const block = await this.bitcoinRpcCall(provider, 'getblock', [blockHash, 2]);
        
        await this.processBitcoinBlock(network, block);
        await this.updateBitcoinConfirmations(network, height);
      }

      // Update last processed block
      await this.setLastProcessedBlock('bitcoin', network, blockCount);
    } catch (error) {
      this.logger.error(`Error in Bitcoin block check: ${error.message}`);
    }
  }

  private async processBitcoinBlock(network: string, block: any) {
    // Get all Bitcoin wallets
    const wallets = await this.walletRepository.find({
      where: {
        blockchain: 'bitcoin',
        network: network,
      },
    });

    const walletAddresses = new Set(wallets.map(w => w.address));

    // Process each transaction
    for (const tx of block.tx) {
      for (const output of tx.vout) {
        const addresses = output.scriptPubKey.addresses || [];
        
        for (const address of addresses) {
          if (walletAddresses.has(address)) {
            const wallet = wallets.find(w => w.address === address);
            
            // Create deposit record
            await this.depositRepository.save({
              userId: wallet.userId,
              walletId: wallet.id,
              tokenId: await this.getBitcoinTokenId(),
              txHash: tx.txid,
              amount: output.value.toString(),
              blockchain: 'bitcoin',
              network: network,
              networkVersion: 'NATIVE',
              blockNumber: block.height,
              status: 'pending',
              metadata: {
                from: tx.vin[0]?.scriptSig?.addresses?.[0] || 'unknown',
                blockHash: block.hash,
              }
            });
          }
        }
      }
    }
  }

  private async bitcoinRpcCall(provider: any, method: string, params: any[]) {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(
          `${provider.auth.username}:${provider.auth.password}`
        ).toString('base64'),
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
        blockchain: 'bitcoin',
        networkVersion: 'NATIVE',
        isActive: true
      }
    });
    return token.id;
  }

  private async updateBitcoinConfirmations(network: string, currentBlock: number) {
    try {
      const deposits = await this.depositRepository.find({
        where: {
          blockchain: 'bitcoin',
          network,
          status: In(['pending', 'confirming']),
          blockNumber: Not(IsNull()),
        },
      });

      for (const deposit of deposits) {
        const confirmations = currentBlock - deposit.blockNumber;
        const requiredConfirmations = this.CONFIRMATION_BLOCKS.bitcoin[network];

        await this.depositRepository.update(deposit.id, {
          confirmations,
          status: confirmations >= requiredConfirmations ? 'confirmed' : 'confirming'
        });

        // If deposit is now confirmed, update wallet balance
        if (confirmations >= requiredConfirmations && deposit.status !== 'confirmed') {
          await this.updateWalletBalance(deposit);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating Bitcoin confirmations: ${error.message}`);
    }
  }

  private async getLastProcessedBlock(blockchain: string, network: string): Promise<number> {
    const key = `last_processed_block_${blockchain}_${network}`;
    const result = await this.walletRepository.manager.query(
      'SELECT value FROM system_settings WHERE key = $1',
      [key]
    );
    return result[0]?.value ? parseInt(result[0].value) : 0;
  }

  private async setLastProcessedBlock(blockchain: string, network: string, blockNumber: number) {
    const key = `last_processed_block_${blockchain}_${network}`;
    await this.walletRepository.manager.query(
      `INSERT INTO system_settings (key, value) 
       VALUES ($1, $2) 
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, blockNumber.toString()]
    );
  }

  private async monitorTron() {
    for (const network of ['mainnet', 'testnet']) {
      const tronWeb = this.providers.get(`trx_${network}`);
      
      setInterval(async () => {
        try {
          await this.checkTronBlocks(network, tronWeb);
        } catch (error) {
          this.logger.error(`Error checking TRON ${network} blocks: ${error.message}`);
        }
      }, 3000); // Check every 3 seconds (TRON has faster block times)
    }
  }

  private async checkTronBlocks(network: string, tronWeb: any) {
    try {
      const currentBlock = await tronWeb.trx.getCurrentBlock();
      const lastProcessedBlock = await this.getLastProcessedBlock('trx', network);

      // Process new blocks
      for (let height = lastProcessedBlock + 1; height <= currentBlock.block_header.raw_data.number; height++) {
        const block = await tronWeb.trx.getBlock(height);
        await this.processTronBlock(network, block);
        await this.updateTronConfirmations(network, height);
      }

      await this.setLastProcessedBlock('trx', network, currentBlock.block_header.raw_data.number);
    } catch (error) {
      this.logger.error(`Error in TRON block check: ${error.message}`);
    }
  }

  private async processTronBlock(network: string, block: any) {
    const tronWebInstance = this.providers.get(`trx_${network}`);
    if (!tronWebInstance) {
      throw new Error(`No TRON provider found for network ${network}`);
    }

    // Get all TRON wallets
    const wallets = await this.walletRepository.find({
      where: {
        blockchain: 'trx',
        network,
      },
    });

    const walletAddresses = new Set(wallets.map(w => w.address));

    // Process each transaction
    for (const tx of block.transactions || []) {
      if (tx.raw_data?.contract?.[0]?.type === 'TransferContract' || 
          tx.raw_data?.contract?.[0]?.type === 'TransferAssetContract') {
        
        const contract = tx.raw_data.contract[0];
        const parameter = contract.parameter.value;
        const toAddress = (tronWebInstance as TronWeb).address.fromHex(parameter.to_address);

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
                from: (tronWebInstance as TronWeb).address.fromHex(parameter.owner_address),
                contractAddress: token.contractAddress,
                blockHash: block.blockID,
              }
            });
          }
        }
      }
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
} 