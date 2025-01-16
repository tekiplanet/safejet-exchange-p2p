export interface BlockchainConfig {
  name: string;
  symbol: string;
  decimals: number;
  testnet: {
    networkId?: number;
    rpcUrl?: string;
    explorerUrl: string;
  };
  mainnet: {
    networkId?: number;
    rpcUrl?: string;
    explorerUrl: string;
  };
}

export const BLOCKCHAIN_CONFIGS: Record<string, BlockchainConfig> = {
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    testnet: {
      explorerUrl: 'https://testnet.blockchain.info',
    },
    mainnet: {
      explorerUrl: 'https://blockchain.info',
    },
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    testnet: {
      networkId: 5, // Goerli
      rpcUrl: 'https://goerli.infura.io/v3/${INFURA_API_KEY}',
      explorerUrl: 'https://goerli.etherscan.io',
    },
    mainnet: {
      networkId: 1,
      rpcUrl: 'https://mainnet.infura.io/v3/${INFURA_API_KEY}',
      explorerUrl: 'https://etherscan.io',
    },
  },
  bsc: {
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    decimals: 18,
    testnet: {
      networkId: 97,
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      explorerUrl: 'https://testnet.bscscan.com',
    },
    mainnet: {
      networkId: 56,
      rpcUrl: 'https://bsc-dataseed.binance.org',
      explorerUrl: 'https://bscscan.com',
    },
  },
  xrp: {
    name: 'XRP Ledger',
    symbol: 'XRP',
    decimals: 6,
    testnet: {
      rpcUrl: 'https://s.altnet.rippletest.net:51234',
      explorerUrl: 'https://testnet.xrpscan.com',
    },
    mainnet: {
      rpcUrl: 'https://xrplcluster.com',
      explorerUrl: 'https://xrpscan.com',
    },
  },
  trx: {
    name: 'TRON',
    symbol: 'TRX',
    decimals: 6,
    testnet: {
      rpcUrl: 'https://api.shasta.trongrid.io',
      explorerUrl: 'https://shasta.tronscan.org',
    },
    mainnet: {
      rpcUrl: 'https://api.trongrid.io',
      explorerUrl: 'https://tronscan.org',
    },
  },
}; 