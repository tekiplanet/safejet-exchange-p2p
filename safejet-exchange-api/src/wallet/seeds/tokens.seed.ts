import { Token } from '../entities/token.entity';

// Add price feed interface
interface PriceFeed {
  provider: 'chainlink' | 'binance' | 'coingecko';
  address?: string;  // For Chainlink price feeds
  symbol?: string;   // For Binance/CoinGecko pairs
  interval?: number; // Update interval in seconds
}

// Add price feed configurations
export const PRICE_FEED_CONFIGS = {
  chainlink: {
    ethereum: {
      mainnet: 'https://api.chain.link/v1/mainnet',
      testnet: 'https://api.chain.link/v1/goerli',
    },
    bsc: {
      mainnet: 'https://api.chain.link/v1/bsc',
      testnet: 'https://api.chain.link/v1/bsc-testnet',
    }
  },
  binance: {
    baseUrl: 'https://api.binance.com/api/v3',
    testnetUrl: 'https://testnet.binance.vision/api/v3'
  },
  coingecko: {
    baseUrl: 'https://api.coingecko.com/api/v3'
  }
};

export const tokenSeeds: Partial<Token>[] = [
  // Bitcoin (updating metadata)
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    blockchain: 'bitcoin',
    contractAddress: null,
    decimals: 8,
    metadata: {
      isNative: true,
      networks: ['mainnet', 'testnet'],
      icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
          interval: 60
        },
        testnet: {
          provider: 'chainlink',
          address: '0xA39434A63A52E749F02807ae27335515BA4b07F7',
          interval: 60
        }
      }
    },
  },

  // Ethereum Mainnet Tokens
  {
    symbol: 'ETH',
    name: 'Ethereum',
    blockchain: 'ethereum',
    contractAddress: null,
    decimals: 18,
    metadata: {
      isNative: true,
      networks: ['mainnet', 'testnet'],
      icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
          interval: 60
        },
        testnet: {
          provider: 'chainlink',
          address: '0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    blockchain: 'ethereum',
    contractAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    blockchain: 'ethereum',
    contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x553303d460EE0afB37EdFf9bE42922D8FF63220e',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    blockchain: 'ethereum',
    contractAddress: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/12645/large/AAVE.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'MKR',
    name: 'Maker',
    blockchain: 'ethereum',
    contractAddress: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/1364/large/Mark_Maker.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0xec1D1B3b0443256cc3860e24a46F108e699484Aa',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'SHIB',
    name: 'Shiba Inu',
    blockchain: 'ethereum',
    contractAddress: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x8dD1CD88F43aF196ae478e91b9F5E4Ac69A97C61',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    blockchain: 'ethereum',
    contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    blockchain: 'ethereum',
    contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    blockchain: 'ethereum',
    contractAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0xfdFD9C85aD200c506Cf9e21F1FD8491902BbE187',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    blockchain: 'ethereum',
    contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/9956/large/4943.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'GRT',
    name: 'The Graph',
    blockchain: 'ethereum',
    contractAddress: '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/13397/large/Graph_Token.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x86cF33a451dE9dc61a2862FD94FF4ad4Bd65A5d2',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'COMP',
    name: 'Compound',
    blockchain: 'ethereum',
    contractAddress: '0xc00e94cb662c3520282e6f5717214004a7f26888',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/10775/large/COMP.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0xdbd020CAeF83eFd542f4De03e3cF0C28A4428bd5',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'MANA',
    name: 'Decentraland',
    blockchain: 'ethereum',
    contractAddress: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/878/large/decentraland-mana.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x56a4857acbcfe3a66965c251628B1c9f1c408C19',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'AXS',
    name: 'Axie Infinity',
    blockchain: 'ethereum',
    contractAddress: '0xbb0e17ef65f82ab018d8edd776e8dd940327b28b',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/13029/large/axie_infinity_logo.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x8B364Ec5b22D3946e44Fb06cB2c9EAe1F1cAa155',
          interval: 60
        }
      }
    },
  },

  // BSC Tokens
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    blockchain: 'bsc',
    contractAddress: null,
    decimals: 18,
    metadata: {
      isNative: true,
      networks: ['mainnet', 'testnet'],
      icon: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
          interval: 60
        },
        testnet: {
          provider: 'binance',
          symbol: 'BNBUSDT',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'CAKE',
    name: 'PancakeSwap',
    blockchain: 'bsc',
    contractAddress: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/12632/large/pancakeswap-cake-logo.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0xB6064eD41d4f67e353768aA239cA86f4F73665a1',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'SAFEMOON',
    name: 'SafeMoon',
    blockchain: 'bsc',
    contractAddress: '0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3',
    decimals: 9,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/14362/large/174x174-white.png',
      priceFeeds: {
        mainnet: {
          provider: 'binance',
          symbol: 'SAFEMOONUSDT',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'BAKE',
    name: 'BakeryToken',
    blockchain: 'bsc',
    contractAddress: '0xE02dF9e3e622DeBdD69fb838bB799E3F168902c5',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/12588/large/bakery_token_logo.jpg',
      priceFeeds: {
        mainnet: {
          provider: 'binance',
          symbol: 'BAKEUSDT',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'XVS',
    name: 'Venus',
    blockchain: 'bsc',
    contractAddress: '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/12677/large/venus.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0xBF63F430A79D4036A5900C19818aFf1fa710f206',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'TWT',
    name: 'Trust Wallet Token',
    blockchain: 'bsc',
    contractAddress: '0x4b0f1812e5df2a09796481ff14017e6005508003',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/11085/large/Trust.png',
      priceFeeds: {
        mainnet: {
          provider: 'binance',
          symbol: 'TWTUSDT',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'ALPHA',
    name: 'Alpha Finance Lab',
    blockchain: 'bsc',
    contractAddress: '0xa1faa113cbe53436df28ff0aee54275c13b40975',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/12738/large/AlphaToken_256x256.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0x7bC032A7C19B1BdCb981D892854d090cfB0f238E',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'AUTO',
    name: 'Auto',
    blockchain: 'bsc',
    contractAddress: '0xa184088a740c695e156f91f5cc086a06bb78b827',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/13751/large/autofarm_icon_200x200.png',
      priceFeeds: {
        mainnet: {
          provider: 'binance',
          symbol: 'AUTOUSDT',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'BURGER',
    name: 'BurgerSwap',
    blockchain: 'bsc',
    contractAddress: '0xae9269f27437f0fcbc232d39ec814844a51d6b8f',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/12563/large/burger.png',
      priceFeeds: {
        mainnet: {
          provider: 'binance',
          symbol: 'BURGERUSDT',
          interval: 60
        }
      }
    },
  },

  // XRP
  {
    symbol: 'XRP',
    name: 'XRP',
    blockchain: 'xrp',
    contractAddress: null,
    decimals: 6,
    metadata: {
      isNative: true,
      networks: ['mainnet', 'testnet'],
      icon: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0xc3E76f41Cc90945b500DeF8C8989dd6390a1e167',
          interval: 60
        }
      }
    },
  },

  // TRON Tokens
  {
    symbol: 'TRX',
    name: 'TRON',
    blockchain: 'trx',
    contractAddress: null,
    decimals: 6,
    metadata: {
      isNative: true,
      networks: ['mainnet', 'testnet'],
      icon: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',
      priceFeeds: {
        mainnet: {
          provider: 'chainlink',
          address: '0xF4C5e535756D11994fCBB12Ba8adD0192D9b88be',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'BTT',
    name: 'BitTorrent',
    blockchain: 'trx',
    contractAddress: 'TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/7595/large/BTT_Token_Graphic.png',
      priceFeeds: {
        mainnet: {
          provider: 'binance',
          symbol: 'BTTUSDT',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'JST',
    name: 'JUST',
    blockchain: 'trx',
    contractAddress: 'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9',
    decimals: 18,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/11095/large/JUST.jpg',
      priceFeeds: {
        mainnet: {
          provider: 'binance',
          symbol: 'JSTUSDT',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'WIN',
    name: 'WINkLink',
    blockchain: 'trx',
    contractAddress: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
    decimals: 6,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/9129/large/win.png',
      priceFeeds: {
        mainnet: {
          provider: 'binance',
          symbol: 'WINUSDT',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'USDT',
    name: 'Tether USD (TRC20)',
    blockchain: 'trx',
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    decimals: 6,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
      priceFeeds: {
        mainnet: {
          provider: 'binance',
          symbol: 'USDTUSDC',
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'USDC',
    name: 'USD Coin (TRC20)',
    blockchain: 'trx',
    contractAddress: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
    decimals: 6,
    metadata: {
      networks: ['mainnet'],
      icon: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
      priceFeeds: {
        mainnet: {
          provider: 'binance',
          symbol: 'USDCUSDT',
          interval: 60
        }
      }
    },
  },

  // Testnet Tokens
  {
    symbol: 'USDT',
    name: 'Tether USD (Goerli)',
    blockchain: 'ethereum',
    contractAddress: '0x509Ee0d083DdF8AC028f2a56731412edD63223B9',
    decimals: 6,
    metadata: {
      networks: ['testnet'],
      testnet: 'goerli',
      icon: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
      priceFeeds: {
        testnet: {
          provider: 'chainlink',
          address: '0x2E2Ed40Fc4f1774d885629C755196f7586b85528', // Goerli USDT/USD
          interval: 60
        }
      }
    },
  },
  {
    symbol: 'USDT',
    name: 'Tether USD (BSC Testnet)',
    blockchain: 'bsc',
    contractAddress: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    decimals: 6,
    metadata: {
      networks: ['testnet'],
      testnet: 'bsc_testnet',
      icon: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
      priceFeeds: {
        testnet: {
          provider: 'binance',
          symbol: 'USDTUSDC',
          interval: 60
        }
      }
    },
  },
]; 