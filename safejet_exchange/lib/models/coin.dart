class Coin {
  final String name;
  final String symbol;
  final String icon;
  final List<Network> networks;

  const Coin({
    required this.name,
    required this.symbol,
    required this.icon,
    required this.networks,
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
    icon: 'bitcoin',
    networks: [
      Network(name: 'Bitcoin Network (BTC)', arrivalTime: '~30 minutes'),
      Network(name: 'Lightning Network', arrivalTime: '~1 minute', isActive: false),
    ],
  ),
  Coin(
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'ethereum',
    networks: [
      Network(name: 'ERC-20', arrivalTime: '~5 minutes'),
    ],
  ),
  Coin(
    name: 'Tether',
    symbol: 'USDT',
    icon: 'tether',
    networks: [
      Network(name: 'ERC-20', arrivalTime: '~5 minutes'),
      Network(name: 'TRC-20', arrivalTime: '~3 minutes'),
      Network(name: 'BEP-20', arrivalTime: '~3 minutes'),
    ],
  ),
  Coin(
    name: 'BNB',
    symbol: 'BNB',
    icon: 'bnb',
    networks: [
      Network(name: 'BEP-20', arrivalTime: '~3 minutes'),
    ],
  ),
  Coin(
    name: 'Solana',
    symbol: 'SOL',
    icon: 'solana',
    networks: [
      Network(name: 'Solana Network', arrivalTime: '~1 minute'),
    ],
  ),
  // Add more coins as needed
]; 