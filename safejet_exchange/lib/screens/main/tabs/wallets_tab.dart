import 'package:flutter/material.dart';
import '../../../config/theme/colors.dart';
import 'package:animate_do/animate_do.dart';
import '../../wallet/deposit_screen.dart';
import '../../wallet/withdraw_screen.dart';
import '../../wallet/transaction_history_screen.dart';
import '../../p2p/p2p_screen.dart';

class WalletsTab extends StatefulWidget {
  const WalletsTab({super.key});

  @override
  State<WalletsTab> createState() => _WalletsTabState();
}

class _WalletsTabState extends State<WalletsTab> {
  String _selectedFilter = 'All';
  final List<String> _filters = ['All', 'Spot', 'Funding'];
  bool _showInUSD = true;

  final double _ngnRate = 1200.0;

  String _formatNumber(double number) {
    return number.toStringAsFixed(2).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},'
    );
  }

  String _formatBalance(bool inUSD) {
    if (inUSD) {
      return '\$${_formatNumber(12384.21)}';
    }
    final ngnBalance = 12384.21 * _ngnRate;
    return '₦${_formatNumber(ngnBalance)}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return SafeArea(
      child: CustomScrollView(
        slivers: [
          // Portfolio Value Card
          SliverToBoxAdapter(
            child: FadeInDown(
              duration: const Duration(milliseconds: 600),
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? [
                            SafeJetColors.secondaryHighlight.withOpacity(0.15),
                            SafeJetColors.primaryAccent.withOpacity(0.05),
                          ]
                        : [
                            SafeJetColors.lightCardBackground,
                            SafeJetColors.lightCardBackground,
                          ],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isDark
                        ? SafeJetColors.secondaryHighlight.withOpacity(0.2)
                        : SafeJetColors.lightCardBorder,
                  ),
                ),
                child: Column(
                  children: [
                    // Currency Toggle
                    Container(
                      padding: const EdgeInsets.all(4),
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
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildCurrencyToggle('USD', true, isDark),
                          _buildCurrencyToggle('NGN', false, isDark),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Total Balance',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const TransactionHistoryScreen(),
                              ),
                            );
                          },
                          child: Row(
                            children: [
                              Text(
                                'History',
                                style: TextStyle(
                                  color: SafeJetColors.secondaryHighlight,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.arrow_forward_ios_rounded,
                                color: SafeJetColors.secondaryHighlight,
                                size: 14,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _buildBalanceText(_formatBalance(_showInUSD)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: SafeJetColors.success.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '+\$${_formatNumber(234.12)} (1.93%)',
                        style: TextStyle(
                          color: SafeJetColors.success,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const DepositScreen(),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: SafeJetColors.success,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                            ),
                            child: const Text('Deposit'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const WithdrawScreen(),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isDark
                                  ? SafeJetColors.primaryAccent.withOpacity(0.1)
                                  : SafeJetColors.lightCardBackground,
                              foregroundColor: isDark ? Colors.white : SafeJetColors.lightText,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: BorderSide(
                                  color: isDark
                                      ? SafeJetColors.primaryAccent.withOpacity(0.2)
                                      : SafeJetColors.lightCardBorder,
                                ),
                              ),
                              elevation: 0,
                            ),
                            child: const Text('Withdraw'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const P2PScreen(),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: SafeJetColors.secondaryHighlight,
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                            ),
                            child: const Text('P2P'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Wallet Type Filter
          SliverToBoxAdapter(
            child: FadeInDown(
              duration: const Duration(milliseconds: 600),
              delay: const Duration(milliseconds: 200),
              child: Container(
                height: 40,
                margin: const EdgeInsets.symmetric(horizontal: 16),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _filters.length,
                  itemBuilder: (context, index) {
                    final isSelected = _filters[index] == _selectedFilter;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedFilter = _filters[index]),
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? SafeJetColors.secondaryHighlight
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? SafeJetColors.secondaryHighlight
                                : (isDark
                                    ? SafeJetColors.primaryAccent.withOpacity(0.2)
                                    : SafeJetColors.lightCardBorder),
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _filters[index],
                          style: TextStyle(
                            color: isSelected
                                ? Colors.black
                                : (isDark ? Colors.white : SafeJetColors.lightText),
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),

          // Assets List
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => FadeInDown(
                  duration: const Duration(milliseconds: 600),
                  delay: Duration(milliseconds: 300 + (index * 100)),
                  child: _buildAssetItem(isDark, theme),
                ),
                childCount: 10,
              ),
            ),
          ),

          // Bottom Padding
          const SliverPadding(
            padding: EdgeInsets.only(bottom: 100),
          ),
        ],
      ),
    );
  }

  Widget _buildAssetItem(bool isDark, ThemeData theme) {
    final usdBalance = 10123.45;
    final ngnBalance = usdBalance * _ngnRate;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark 
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? SafeJetColors.primaryAccent.withOpacity(0.2)
              : SafeJetColors.lightCardBorder,
        ),
      ),
      child: Row(
        children: [
          // Coin Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  SafeJetColors.secondaryHighlight,
                  SafeJetColors.secondaryHighlight.withOpacity(0.8),
                ],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.currency_bitcoin, color: Colors.black, size: 24),
          ),
          const SizedBox(width: 12),
          
          // Coin Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bitcoin',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'BTC',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          
          // Balance Info
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '0.2384 BTC',
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              _buildAssetBalance(
                _showInUSD 
                    ? '\$${_formatNumber(usdBalance)}'
                    : '₦${_formatNumber(ngnBalance)}',
                isDark,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCurrencyToggle(String currency, bool isUSD, bool isDark) {
    final isSelected = _showInUSD == isUSD;
    
    return GestureDetector(
      onTap: () => setState(() => _showInUSD = isUSD),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 8,
        ),
        decoration: BoxDecoration(
          color: isSelected ? SafeJetColors.secondaryHighlight : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          currency,
          style: TextStyle(
            color: isSelected ? Colors.black : (isDark ? Colors.white : SafeJetColors.lightText),
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildBalanceText(String text) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      transitionBuilder: (Widget child, Animation<double> animation) {
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0.0, 0.2),
              end: Offset.zero,
            ).animate(animation),
            child: child,
          ),
        );
      },
      child: Text(
        text,
        key: ValueKey<String>(text),
        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildAssetBalance(String text, bool isDark) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: Text(
        text,
        key: ValueKey<String>(text),
        style: TextStyle(
          color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
        ),
      ),
    );
  }
} 