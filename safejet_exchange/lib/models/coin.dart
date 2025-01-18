class Coin {
  final String symbol;
  final String name;
  final List<Network> networks;
  final String? iconUrl;

  const Coin({
    required this.symbol,
    required this.name,
    required this.networks,
    this.iconUrl,
  });
}

class Network {
  final String name;        // mainnet/testnet
  final String blockchain;  // ethereum/trx/bsc
  final String version;     // ERC20/TRC20/BEP20/NATIVE
  final String arrivalTime;
  final bool isActive;

  const Network({
    required this.name,
    required this.blockchain,
    required this.version,
    required this.arrivalTime,
    this.isActive = true,
  });
}

// Demo coins list
final List<Coin> coins = [
  Coin(
    name: 'Bitcoin',
    symbol: 'BTC',
    iconUrl: 'bitcoin',
    networks: [
      Network(
        name: 'mainnet',
        blockchain: 'bitcoin',
        version: 'NATIVE',
        arrivalTime: '~30 minutes'
      ),
      Network(
        name: 'mainnet',
        blockchain: 'bitcoin',
        version: 'LIGHTNING',
        arrivalTime: '~1 minute',
        isActive: false
      ),
    ],
  ),
  Coin(
    name: 'Ethereum',
    symbol: 'ETH',
    iconUrl: 'ethereum',
    networks: [
      Network(
        name: 'mainnet',
        blockchain: 'ethereum',
        version: 'NATIVE',
        arrivalTime: '~5 minutes'
      ),
    ],
  ),
  Coin(
    name: 'Tether',
    symbol: 'USDT',
    iconUrl: 'tether',
    networks: [
      Network(
        name: 'mainnet',
        blockchain: 'ethereum',
        version: 'ERC20',
        arrivalTime: '~5 minutes'
      ),
      Network(
        name: 'mainnet',
        blockchain: 'trx',
        version: 'TRC20',
        arrivalTime: '~3 minutes'
      ),
      Network(
        name: 'mainnet',
        blockchain: 'bsc',
        version: 'BEP20',
        arrivalTime: '~3 minutes'
      ),
    ],
  ),
  Coin(
    name: 'BNB',
    symbol: 'BNB',
    iconUrl: 'bnb',
    networks: [
      Network(
        name: 'mainnet',
        blockchain: 'bsc',
        version: 'NATIVE',
        arrivalTime: '~3 minutes'
      ),
    ],
  ),
  Coin(
    name: 'Solana',
    symbol: 'SOL',
    iconUrl: 'solana',
    networks: [
      Network(
        name: 'mainnet',
        blockchain: 'solana',
        version: 'NATIVE',
        arrivalTime: '~1 minute'
      ),
    ],
  ),
  // Add more coins as needed
]; 