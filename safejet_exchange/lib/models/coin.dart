class Coin {
  final String id;
  final String symbol;
  final String name;
  final List<Network> networks;
  final String? iconUrl;

  const Coin({
    required this.id,
    required this.symbol,
    required this.name,
    required this.networks,
    this.iconUrl,
  });
}

class Network {
  final String name;
  final String blockchain;
  final String version;
  final String arrivalTime;
  final bool isActive;
  final bool requiresMemo;
  final bool requiresTag;
  final String network;

  Network({
    required this.name,
    required this.blockchain,
    required this.version,
    required this.arrivalTime,
    this.network = 'mainnet',
    this.isActive = true,
    this.requiresMemo = false,
    this.requiresTag = false,
  });
}

// Demo coins list
final List<Coin> coins = [
  Coin(
    id: 'btc-native-mainnet',
    name: 'Bitcoin',
    symbol: 'BTC',
    iconUrl: 'bitcoin',
    networks: [
      Network(
        name: 'mainnet',
        blockchain: 'bitcoin',
        version: 'NATIVE',
        arrivalTime: '~30 minutes',
        network: 'mainnet'
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
    id: 'eth-native-mainnet',
    name: 'Ethereum',
    symbol: 'ETH',
    iconUrl: 'ethereum',
    networks: [
      Network(
        name: 'mainnet',
        blockchain: 'ethereum',
        version: 'NATIVE',
        arrivalTime: '~5 minutes',
        network: 'mainnet'
      ),
    ],
  ),
  Coin(
    id: 'usdt-multi-chain',
    name: 'Tether',
    symbol: 'USDT',
    iconUrl: 'tether',
    networks: [
      Network(
        name: 'mainnet',
        blockchain: 'ethereum',
        version: 'ERC20',
        arrivalTime: '~5 minutes',
        network: 'mainnet'
      ),
      Network(
        name: 'mainnet',
        blockchain: 'trx',
        version: 'TRC20',
        arrivalTime: '~3 minutes',
        network: 'mainnet'
      ),
      Network(
        name: 'mainnet',
        blockchain: 'bsc',
        version: 'BEP20',
        arrivalTime: '~3 minutes',
        network: 'mainnet'
      ),
    ],
  ),
  Coin(
    id: 'bnb-native-mainnet',
    name: 'BNB',
    symbol: 'BNB',
    iconUrl: 'bnb',
    networks: [
      Network(
        name: 'mainnet',
        blockchain: 'bsc',
        version: 'NATIVE',
        arrivalTime: '~3 minutes',
        network: 'mainnet'
      ),
    ],
  ),
  Coin(
    id: 'sol-native-mainnet',
    name: 'Solana',
    symbol: 'SOL',
    iconUrl: 'solana',
    networks: [
      Network(
        name: 'mainnet',
        blockchain: 'solana',
        version: 'NATIVE',
        arrivalTime: '~1 minute',
        network: 'mainnet'
      ),
    ],
  ),
  // Add more coins as needed
]; 