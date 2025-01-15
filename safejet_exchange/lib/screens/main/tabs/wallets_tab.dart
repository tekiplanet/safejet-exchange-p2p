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
  bool _showZeroBalances = true;

  final double _ngnRate = 1200.0;

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

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

  List<int> _getFilteredAssets() {
    return List.generate(10, (index) {
      final hasBalance = index % 2 == 0;
      final assetName = 'Bitcoin'; // Replace with actual asset name
      final assetSymbol = 'BTC'; // Replace with actual asset symbol
      
      // Filter by balance
      if (!_showZeroBalances && !hasBalance) {
        return -1;
      }
      
      // Filter by search
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        if (!assetName.toLowerCase().contains(query) && 
            !assetSymbol.toLowerCase().contains(query)) {
          return -1;
        }
      }
      
      return index;
    }).where((index) => index != -1).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return SafeArea(
      child: CustomScrollView(
        slivers: [
          // Modern Header with Balance
          SliverToBoxAdapter(
            child: FadeInDown(
              duration: const Duration(milliseconds: 600),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: isDark
                        ? [
                            SafeJetColors.primaryAccent.withOpacity(0.15),
                            SafeJetColors.secondaryHighlight.withOpacity(0.05),
                          ]
                        : [
                            SafeJetColors.lightCardBackground,
                            SafeJetColors.lightCardBackground.withOpacity(0.8),
                          ],
                  ),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(32),
                    bottomRight: Radius.circular(32),
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Portfolio Value',
                              style: theme.textTheme.titleMedium?.copyWith(
                                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _buildBalanceText(_formatBalance(_showInUSD)),
                          ],
                        ),
                        _buildCurrencyToggleButton(isDark),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: SafeJetColors.success.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.trending_up_rounded,
                                color: SafeJetColors.success,
                                size: 16,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '+\$${_formatNumber(234.12)} (1.93%)',
                                style: TextStyle(
                                  color: SafeJetColors.success,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const TransactionHistoryScreen(),
                            ),
                          ),
                          style: IconButton.styleFrom(
                            backgroundColor: isDark 
                                ? Colors.white.withOpacity(0.1)
                                : Colors.black.withOpacity(0.05),
                            padding: const EdgeInsets.all(12),
                          ),
                          icon: Icon(
                            Icons.history_rounded,
                            color: isDark ? Colors.white : SafeJetColors.lightText,
                            size: 20,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Quick Actions Grid
          SliverToBoxAdapter(
            child: FadeInDown(
              duration: const Duration(milliseconds: 600),
              delay: const Duration(milliseconds: 100),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Quick Actions',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildQuickActionCard(
                                  context,
                                  icon: Icons.add_rounded,
                                  label: 'Deposit',
                                  description: 'Add funds',
                                  color: SafeJetColors.success,
                                  onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (context) => const DepositScreen()),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                _buildQuickActionCard(
                                  context,
                                  icon: Icons.arrow_upward_rounded,
                                  label: 'Withdraw',
                                  description: 'To bank',
                                  color: isDark ? Colors.white : SafeJetColors.lightText,
                                  onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (context) => const WithdrawScreen()),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                _buildQuickActionCard(
                                  context,
                                  icon: Icons.swap_horiz_rounded,
                                  label: 'P2P',
                                  description: 'Trade',
                                  color: SafeJetColors.secondaryHighlight,
                                  onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (context) => const P2PScreen()),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                _buildQuickActionCard(
                                  context,
                                  icon: Icons.send_rounded,
                                  label: 'Transfer',
                                  description: 'Send crypto',
                                  color: Colors.purple,
                                  onTap: () {
                                    // TODO: Add transfer screen
                                  },
                                ),
                                const SizedBox(width: 12),
                                _buildQuickActionCard(
                                  context,
                                  icon: Icons.currency_exchange_rounded,
                                  label: 'Convert',
                                  description: 'Swap coins',
                                  color: Colors.blue,
                                  onTap: () {
                                    // TODO: Add convert screen
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Assets Section Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Your Assets',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Row(
                        children: [
                          Text(
                            'Show zero',
                            style: TextStyle(
                              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Switch.adaptive(
                            value: _showZeroBalances,
                            onChanged: (value) => setState(() => _showZeroBalances = value),
                            activeColor: SafeJetColors.secondaryHighlight,
                            activeTrackColor: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
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
                    child: TextField(
                      controller: _searchController,
                      onChanged: (value) => setState(() => _searchQuery = value),
                      style: TextStyle(
                        color: isDark ? Colors.white : SafeJetColors.lightText,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Search assets',
                        hintStyle: TextStyle(
                          color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                        ),
                        prefixIcon: Icon(
                          Icons.search_rounded,
                          color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _filters.map((filter) {
                        final isSelected = _selectedFilter == filter;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => setState(() => _selectedFilter = filter),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? SafeJetColors.secondaryHighlight
                                      : (isDark 
                                          ? SafeJetColors.primaryAccent.withOpacity(0.1)
                                          : SafeJetColors.lightCardBackground),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSelected
                                        ? SafeJetColors.secondaryHighlight
                                        : (isDark
                                            ? SafeJetColors.primaryAccent.withOpacity(0.2)
                                            : SafeJetColors.lightCardBorder),
                                  ),
                                ),
                                child: Text(
                                  filter,
                                  style: TextStyle(
                                    color: isSelected
                                        ? Colors.black
                                        : (isDark ? Colors.white : SafeJetColors.lightText),
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Assets List
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final filteredAssets = _getFilteredAssets();
                  if (index >= filteredAssets.length) return null;
                  
                  return FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    delay: Duration(milliseconds: 300 + (index * 100)),
                    child: _buildAssetItem(isDark, theme, filteredAssets[index]),
                  );
                },
                childCount: _showZeroBalances ? 10 : 5, // Adjust based on filtered count
              ),
            ),
          ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String description,
    required Color color,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      width: 100,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(12),
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
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  description,
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCurrencyToggleButton(bool isDark) {
    return Container(
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

  Widget _buildAssetItem(bool isDark, ThemeData theme, int index) {
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