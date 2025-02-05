export const TOKEN_CONFIG = {
    networkVersions: [
        { value: 'ERC20', label: 'ERC20' },
        { value: 'BEP20', label: 'BEP20' },
        { value: 'TRC20', label: 'TRC20' },
        { value: 'NATIVE', label: 'NATIVE' }
    ],
    networks: [
        { value: 'mainnet', label: 'Mainnet' },
        { value: 'testnet', label: 'Testnet' }
    ],
    blockchains: [
        { value: 'ethereum', label: 'Ethereum' },
        { value: 'bitcoin', label: 'Bitcoin' },
        { value: 'bsc', label: 'BSC' },
        { value: 'trx', label: 'TRON' },
        { value: 'xrp', label: 'XRP' }
    ],
    priceFeedProviders: [
        { value: 'chainlink', label: 'Chainlink' },
        { value: 'binance', label: 'Binance' }
    ],
    defaults: {
        interval: 60,
        arrivalTimes: {
            NATIVE: '30-60 minutes',
            default: '10-30 minutes'
        }
    }
} as const;

// Type helpers
export type NetworkVersion = typeof TOKEN_CONFIG.networkVersions[number]['value'];
export type Network = typeof TOKEN_CONFIG.networks[number]['value'];
export type Blockchain = typeof TOKEN_CONFIG.blockchains[number]['value'];
export type PriceFeedProvider = typeof TOKEN_CONFIG.priceFeedProviders[number]['value']; 