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
  final String name;
  final String arrivalTime;
  final bool isActive;

  const Network({
    required this.name,
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
      Network(name: 'Bitcoin Network (BTC)', arrivalTime: '~30 minutes'),
      Network(name: 'Lightning Network', arrivalTime: '~1 minute', isActive: false),
    ],
  ),
  Coin(
    name: 'Ethereum',
    symbol: 'ETH',
    iconUrl: 'ethereum',
    networks: [
      Network(name: 'ERC-20', arrivalTime: '~5 minutes'),
    ],
  ),
  Coin(
    name: 'Tether',
    symbol: 'USDT',
    iconUrl: 'tether',
    networks: [
      Network(name: 'ERC-20', arrivalTime: '~5 minutes'),
      Network(name: 'TRC-20', arrivalTime: '~3 minutes'),
      Network(name: 'BEP-20', arrivalTime: '~3 minutes'),
    ],
  ),
  Coin(
    name: 'BNB',
    symbol: 'BNB',
    iconUrl: 'bnb',
    networks: [
      Network(name: 'BEP-20', arrivalTime: '~3 minutes'),
    ],
  ),
  Coin(
    name: 'Solana',
    symbol: 'SOL',
    iconUrl: 'solana',
    networks: [
      Network(name: 'Solana Network', arrivalTime: '~1 minute'),
    ],
  ),
  // Add more coins as needed
]; 