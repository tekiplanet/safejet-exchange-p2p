import 'package:flutter/material.dart';
import '../config/theme/colors.dart';
import 'package:animate_do/animate_do.dart';
import '../models/coin.dart';

class CoinSelectionModal extends StatefulWidget {
  const CoinSelectionModal({super.key});

  @override
  State<CoinSelectionModal> createState() => _CoinSelectionModalState();
}

class _CoinSelectionModalState extends State<CoinSelectionModal> {
  final TextEditingController _searchController = TextEditingController();
  List<Coin> _filteredCoins = coins;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_filterCoins);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterCoins() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredCoins = coins.where((coin) {
        return coin.name.toLowerCase().contains(query) ||
               coin.symbol.toLowerCase().contains(query);
      }).toList();
    });
  }

  IconData _getCoinIcon(String icon) {
    switch (icon) {
      case 'bitcoin':
        return Icons.currency_bitcoin;
      case 'ethereum':
        return Icons.currency_exchange;
      case 'tether':
        return Icons.attach_money;
      case 'bnb':
        return Icons.monetization_on;
      case 'solana':
        return Icons.solar_power;
      default:
        return Icons.currency_bitcoin;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: BoxDecoration(
        color: isDark ? SafeJetColors.primaryBackground : SafeJetColors.lightBackground,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: isDark ? Colors.white24 : Colors.black12,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search coin',
                prefixIcon: Icon(
                  Icons.search,
                  color: isDark ? Colors.grey[600] : Colors.grey[400],
                ),
                filled: true,
                fillColor: isDark 
                    ? SafeJetColors.primaryAccent.withOpacity(0.1)
                    : SafeJetColors.lightCardBackground,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark
                        ? SafeJetColors.primaryAccent.withOpacity(0.2)
                        : SafeJetColors.lightCardBorder,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark
                        ? SafeJetColors.primaryAccent.withOpacity(0.2)
                        : SafeJetColors.lightCardBorder,
                  ),
                ),
              ),
            ),
          ),

          // Coins List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _filteredCoins.length,
              itemBuilder: (context, index) {
                final coin = _filteredCoins[index];
                return FadeInDown(
                  duration: const Duration(milliseconds: 600),
                  delay: Duration(milliseconds: 100 * index),
                  child: InkWell(
                    onTap: () => Navigator.pop(context, coin),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isDark 
                            ? SafeJetColors.primaryAccent.withOpacity(0.1)
                            : SafeJetColors.lightCardBackground,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark
                              ? SafeJetColors.primaryAccent.withOpacity(0.2)
                              : SafeJetColors.lightCardBorder,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: SafeJetColors.secondaryHighlight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              _getCoinIcon(coin.icon),
                              color: Colors.black,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  coin.name,
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  coin.symbol,
                                  style: TextStyle(
                                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
} 