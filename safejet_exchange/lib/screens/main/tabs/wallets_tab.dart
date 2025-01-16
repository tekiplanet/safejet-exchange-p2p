import 'package:flutter/material.dart';
import '../../../config/theme/colors.dart';
import 'package:animate_do/animate_do.dart';
import '../../wallet/deposit_screen.dart';
import '../../wallet/withdraw_screen.dart';
import '../../wallet/transaction_history_screen.dart';
import '../../p2p/p2p_screen.dart';
import '../../../services/p2p_settings_service.dart';
import '../../../services/exchange_service.dart';
import '../../../services/service_locator.dart';
import 'package:shimmer/shimmer.dart';
import '../../../services/wallet_service.dart';

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

  String _userCurrency = 'USD';
  double _userCurrencyRate = 1.0;
  bool _isLoading = true;

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final _exchangeService = getIt<ExchangeService>();
  final _p2pSettingsService = getIt<P2PSettingsService>();
  final WalletService _walletService = getIt<WalletService>();
  List<Map<String, dynamic>> _balances = [];
  double _totalBalance = 0.0;
  Map<String, double> _tokenPrices = {};
  bool _hasError = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadUserSettings();
    _loadBalances();
  }

  Future<void> _loadUserSettings() async {
    try {
      setState(() => _isLoading = true);
      
      print('Loading user settings...');
      
      final settings = await _p2pSettingsService.getSettings();
      print('Settings loaded: $settings');
      
      final rates = await _exchangeService.getRates(settings['currency'] ?? 'USD');
      print('Rates loaded: $rates');
      
      setState(() {
        _userCurrency = settings['currency'] ?? 'USD';
        _userCurrencyRate = double.tryParse(rates['rate'].toString()) ?? 1.0;
        _isLoading = false;
      });

      print('Settings updated - Currency: $_userCurrency, Rate: $_userCurrencyRate');
    } catch (e, stackTrace) {
      print('Error loading settings: $e');
      print('Stack trace: $stackTrace');
      
      setState(() {
        _userCurrency = 'USD';
        _userCurrencyRate = 1.0;
        _isLoading = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading settings: ${e.toString()}'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _loadBalances() async {
    if (!mounted) return;

    try {
      setState(() {
        _isLoading = true;
        _hasError = false;
        _errorMessage = '';
      });
      
      final type = _selectedFilter == 'All' ? null : _selectedFilter.toLowerCase();
      final data = await _walletService.getBalances(
        type: type,
        currency: _showInUSD ? 'USD' : _userCurrency,
      );
      
      if (!mounted) return;

      setState(() {
        _balances = List<Map<String, dynamic>>.from(data['balances'] ?? [])
            .where((b) => b != null && b['token'] != null)
            .toList();
        _totalBalance = (data['total'] ?? 0.0).toDouble();
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading balances: $e');
      if (!mounted) return;
      
      setState(() {
        _balances = [];
        _totalBalance = 0.0;
        _isLoading = false;
        _hasError = true;
        _errorMessage = 'Failed to load balances';
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading balances. Please try again.'),
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(
            label: 'Retry',
            onPressed: _loadBalances,
          ),
        ),
      );
    }
  }

  String _formatNumber(double number) {
    return number.toStringAsFixed(2).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},'
    );
  }

  String _formatBalance(bool inUSD, double balance) {
    if (inUSD) {
      return '\$${_formatNumber(balance)}';
    }
    final localBalance = balance * _userCurrencyRate;
    return '${_getCurrencySymbol(_userCurrency)}${_formatNumber(localBalance)}';
  }

  String _getCurrencySymbol(String currency) {
    switch (currency.toUpperCase()) {
      case 'NGN':
        return '₦';
      case 'USD':
        return '\$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return currency;
    }
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

  Widget _buildShimmer() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
      highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Portfolio Value Shimmer
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? Colors.grey[800] : Colors.white,
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
                          Container(
                            width: 100,
                            height: 16,
                            color: isDark ? Colors.grey[700] : Colors.white,
                          ),
                          const SizedBox(height: 8),
                          Container(
                            width: 150,
                            height: 32,
                            color: isDark ? Colors.grey[700] : Colors.white,
                          ),
                        ],
                      ),
                      // Currency Toggle Shimmer
                      Container(
                        width: 120,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isDark ? Colors.grey[700] : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Container(
                        width: 120,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isDark ? Colors.grey[700] : Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isDark ? Colors.grey[700] : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Quick Actions Shimmer
            SizedBox(
              height: 100,
              child: Row(
                children: List.generate(3, (index) => Expanded(
                  child: Container(
                    margin: EdgeInsets.only(
                      left: index == 0 ? 0 : 8,
                      right: index == 2 ? 0 : 8,
                    ),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey[800] : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark 
                            ? Colors.grey[700]! 
                            : Colors.grey[300]!,
                      ),
                    ),
                  ),
                )),
              ),
            ),

            const SizedBox(height: 24),

            // Assets List Shimmer
            ...List.generate(5, (index) => Container(
              height: 80,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: isDark ? Colors.grey[800] : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark 
                      ? Colors.grey[700]! 
                      : Colors.grey[300]!,
                ),
              ),
            )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isLoading) {
      return _buildShimmer();
    }

    if (_hasError) {
      return _buildErrorState();
    }

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
                            _buildBalanceText(_formatBalance(_showInUSD, 12384.21)),
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
                          child: InkWell(
                            onTap: () {
                              setState(() => _selectedFilter = filter);
                              _loadBalances();
                            },
                            borderRadius: BorderRadius.circular(24),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected 
                                    ? SafeJetColors.secondaryHighlight 
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(
                                  color: isSelected
                                      ? SafeJetColors.secondaryHighlight
                                      : Colors.grey.withOpacity(0.3),
                                  width: 1,
                                ),
                              ),
                              child: Text(
                                filter,
                                style: TextStyle(
                                  color: isSelected 
                                      ? Colors.black 
                                      : isDark 
                                          ? Colors.white 
                                          : Colors.black,
                                  fontWeight: isSelected 
                                      ? FontWeight.bold 
                                      : FontWeight.normal,
                                  fontSize: 14,
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

          // Asset List
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                if (_balances.isEmpty) {
                  return _buildEmptyState();
                }

                final balance = _balances[index];
                final token = balance['token'] as Map<String, dynamic>;
                final amount = double.tryParse(balance['balance'] as String) ?? 0.0;
                
                return _buildAssetItem(
                  isDark,
                  theme,
                  token['name'] as String,
                  token['symbol'] as String,
                  amount,
                  token['metadata']?['icon'] as String?,
                );
              },
              childCount: _balances.isEmpty ? 1 : _balances.length,
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
    if (_isLoading) {
      return const CircularProgressIndicator();
    }

    // If user's currency is USD, don't show the toggle
    if (_userCurrency.toUpperCase() == 'USD') {
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
        child: _buildCurrencyToggle('USD', true, isDark),
      );
    }

    // Show toggle for other currencies
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
          _buildCurrencyToggle(_userCurrency, false, isDark),
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

  Widget _buildAssetItem(
    bool isDark,
    ThemeData theme,
    String name,
    String symbol,
    double balance,
    String? iconUrl,
  ) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
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
              color: SafeJetColors.secondaryHighlight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: iconUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      iconUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Icon(
                        Icons.currency_bitcoin,
                        color: Colors.black,
                        size: 24,
                      ),
                    ),
                  )
                : Icon(Icons.currency_bitcoin, color: Colors.black, size: 24),
          ),
          const SizedBox(width: 12),
          
          // Coin Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  symbol,
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
                '${balance.toStringAsFixed(4)} $symbol',
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              _buildAssetBalance(
                _formatBalance(_showInUSD, balance * (_tokenPrices[symbol] ?? 0)),
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

  Future<void> _loadRates() async {
    try {
      final rates = await _exchangeService.getRates('ngn'); // or your default currency
      // Update your UI with the rates
    } catch (e) {
      // Handle error
      print('Error loading rates: $e');
    }
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 64,
              color: SafeJetColors.error,
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: SafeJetColors.error,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Please check your connection and try again',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.grey[400]
                    : SafeJetColors.lightTextSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadBalances,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: SafeJetColors.secondaryHighlight,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.account_balance_wallet_outlined,
              size: 64,
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.grey[400]
                  : SafeJetColors.lightTextSecondary,
            ),
            const SizedBox(height: 16),
            Text(
              'No Assets Found',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Start by depositing some assets into your wallet',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.grey[400]
                    : SafeJetColors.lightTextSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const DepositScreen(),
                  ),
                );
              },
              icon: const Icon(Icons.add_rounded),
              label: const Text('Deposit Assets'),
              style: ElevatedButton.styleFrom(
                backgroundColor: SafeJetColors.secondaryHighlight,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
} 