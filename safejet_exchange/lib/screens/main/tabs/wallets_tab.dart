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
import 'dart:async';
import 'package:intl/intl.dart';

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
  double _change24h = 0.0;
  double _changePercent24h = 0.0;
  bool _isPriceLoading = false;
  Timer? _refreshTimer;
  bool _isInitialLoad = true;

  final int _pageSize = 20;
  int _currentPage = 1;
  bool _isLoadingMore = false;
  bool _hasMoreData = true;
  final ScrollController _scrollController = ScrollController();

  double _usdBalance = 0.0;
  double _usdChange24h = 0.0;

  List<Map<String, dynamic>> _sortBalances(List<Map<String, dynamic>> balances) {
    return [...balances]..sort((a, b) {
      final balanceA = double.tryParse(a['balance']?.toString() ?? '0') ?? 0.0;
      final balanceB = double.tryParse(b['balance']?.toString() ?? '0') ?? 0.0;
      
      // Safely convert price to double regardless of whether it's int or double
      final priceA = double.tryParse(a['price']?.toString() ?? '0') ?? 0.0;
      final priceB = double.tryParse(b['price']?.toString() ?? '0') ?? 0.0;
      
      // Calculate fiat values
      final fiatValueA = balanceA * priceA;
      final fiatValueB = balanceB * priceB;
      
      // If both have zero value, sort alphabetically by symbol
      if (fiatValueA == 0 && fiatValueB == 0) {
        return (a['token']['symbol'] as String)
            .compareTo(b['token']['symbol'] as String);
      }
      
      // If only one has value, it should come first
      if (fiatValueA == 0) return 1;
      if (fiatValueB == 0) return -1;
      
      // If both have value, sort by fiat value (highest first)
      return fiatValueB.compareTo(fiatValueA);
    });
  }

  @override
  void initState() {
    super.initState();
    _loadUserSettings();
    _loadBalances();
    _setupScrollController();
    
    // Set up periodic refresh
    _refreshTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) {
        _loadBalances(showLoading: false);
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
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
        _userCurrencyRate = double.tryParse(rates['rate']?.toString() ?? '1') ?? 1.0;
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

  Future<void> _loadBalances({bool showLoading = true}) async {
    if (!mounted) return;

    try {
      if (showLoading && _isInitialLoad) {
        setState(() {
          _isLoading = true;
          _isPriceLoading = true;
        });
      }

      final type = _selectedFilter == 'All' ? null : _selectedFilter.toLowerCase();
      final data = await _walletService.getBalances(
        type: type,
        currency: _showInUSD ? 'USD' : _userCurrency,
      );

      if (!mounted) return;

      if (_selectedFilter == 'All') {
        final Map<String, Map<String, dynamic>> combinedBalances = {};
        
        for (final balance in List<Map<String, dynamic>>.from(data['balances'] ?? [])) {
          final token = balance['token'] as Map<String, dynamic>;
          final symbol = token['symbol'] as String;
          
          // Safely parse balance
          final currentBalance = double.tryParse(balance['balance'].toString()) ?? 0.0;
          
          if (combinedBalances.containsKey(symbol)) {
            // Safely parse existing balance
            final existingBalance = double.tryParse(combinedBalances[symbol]!['balance'].toString()) ?? 0.0;
            combinedBalances[symbol]!['balance'] = (existingBalance + currentBalance).toString();
          } else {
            combinedBalances[symbol] = {
              ...balance,
              'token': token,
            };
          }
        }

        setState(() {
          _balances = _sortBalances(combinedBalances.values.toList());
          // Store USD values
          _usdBalance = double.tryParse(data['total']?.toString() ?? '0') ?? 0.0;
          _usdChange24h = double.tryParse(data['change24h']?.toString() ?? '0') ?? 0.0;
          // Set displayed values based on current currency
          _totalBalance = _showInUSD ? _usdBalance : _usdBalance * _userCurrencyRate;
          _change24h = _showInUSD ? _usdChange24h : _usdChange24h * _userCurrencyRate;
          _changePercent24h = double.tryParse(data['changePercent24h']?.toString() ?? '0') ?? 0.0;
          
          // Update token prices with safe parsing
          _tokenPrices = Map<String, double>.fromEntries(
            _balances.map((b) => MapEntry(
              b['token']['symbol'] as String,
              double.tryParse(b['price']?.toString() ?? '0') ?? 0.0,
            )),
          );
          
          _isLoading = false;
          _isPriceLoading = false;
          _isInitialLoad = false;
        });
      } else {
        setState(() {
          _balances = _sortBalances(List<Map<String, dynamic>>.from(data['balances'] ?? []));
          // Store USD values
          _usdBalance = double.tryParse(data['total']?.toString() ?? '0') ?? 0.0;
          _usdChange24h = double.tryParse(data['change24h']?.toString() ?? '0') ?? 0.0;
          // Set displayed values based on current currency
          _totalBalance = _showInUSD ? _usdBalance : _usdBalance * _userCurrencyRate;
          _change24h = _showInUSD ? _usdChange24h : _usdChange24h * _userCurrencyRate;
          _changePercent24h = double.tryParse(data['changePercent24h']?.toString() ?? '0') ?? 0.0;
          
          // Update token prices with safe parsing
          _tokenPrices = Map<String, double>.fromEntries(
            _balances.map((b) => MapEntry(
              b['token']['symbol'] as String,
              double.tryParse(b['price']?.toString() ?? '0') ?? 0.0,
            )),
          );
          
          _isLoading = false;
          _isPriceLoading = false;
          _isInitialLoad = false;
        });
      }
    } catch (e) {
      print('Error in _loadBalances: $e');
      if (!mounted) return;
      
      setState(() {
        _isLoading = false;
        _isPriceLoading = false;
        _hasError = true;
        _errorMessage = 'Failed to load balances';
      });
    }
  }

  String _formatBalance(bool inUSD, double value) {
    final symbol = inUSD ? '\$' : _getCurrencySymbol(_userCurrency);
    return '$symbol${_formatNumber(value)}';
  }

  String _formatNumber(double value) {
    if (value == 0) return '0.00';
    
    // Use NumberFormat for proper thousand separators and decimal places
    final formatter = NumberFormat('#,##0.00', 'en_US');
    return formatter.format(value);
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
        controller: _scrollController,
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
                              _getBalanceTitle(),
                              style: theme.textTheme.titleMedium?.copyWith(
                                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _buildBalanceText(_formatBalance(_showInUSD, _totalBalance)),
                          ],
                        ),
                        _buildCurrencyToggleButton(isDark),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        _buildPriceChange(),
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
                // Get filtered balances
                final filteredBalances = _getFilteredBalances();

                if (filteredBalances.isEmpty) {
                  return _buildEmptyState();
                }

                // Add loading indicator at the bottom
                if (index == filteredBalances.length) {
                  if (_isLoadingMore) {
                    return Container(
                      padding: const EdgeInsets.all(16.0),
                      alignment: Alignment.center,
                      child: const CircularProgressIndicator(),
                    );
                  } else if (!_hasMoreData) {
                    return const SizedBox(); // Hide when no more data
                  }
                  return const SizedBox();
                }

                if (index >= filteredBalances.length) return null;

                final balance = filteredBalances[index];
                final token = balance['token'] as Map<String, dynamic>;
                final amount = double.tryParse(balance['balance']?.toString() ?? '0') ?? 0.0;
                final symbol = token['symbol'] as String;
                final price = _tokenPrices[symbol] ?? 0.0;
                final isLoading = balance['priceLoading'] ?? false;
                
                return _buildAssetItem(
                  isDark,
                  theme,
                  token['name'] as String,
                  symbol,
                  amount,
                  token['metadata']?['icon'] as String?,
                  token['metadata'] as Map<String, dynamic>?,
                  balance,
                );
              },
              childCount: _getFilteredBalances().isEmpty ? 1 : _getFilteredBalances().length + 1,
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
      onTap: () {
        if (_showInUSD != isUSD) {
          _updateCurrencyDisplay(isUSD);
        }
      },
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
    double amount,
    String? iconUrl,
    Map<String, dynamic>? tokenMetadata,
    Map<String, dynamic> balance,
  ) {
    // Safely parse all numeric values
    final price = double.tryParse(balance['price']?.toString() ?? '0') ?? 0.0;
    final price24h = double.tryParse(balance['price24h']?.toString() ?? '0') ?? 0.0;
    final changePercent24h = double.tryParse(balance['changePercent24h']?.toString() ?? '0') ?? 0.0;
    final fiatValue = amount * price;

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
          // Token Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              image: iconUrl != null
                  ? DecorationImage(
                      image: NetworkImage(iconUrl),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: iconUrl == null
                ? Center(
                    child: Text(
                      symbol[0],
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          
          // Token Name and Symbol
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      symbol,
                      style: TextStyle(
                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                      ),
                    ),
                    // Use balance metadata to check network
                    if (balance['network'] == 'testnet')
                      Container(
                        margin: const EdgeInsets.only(left: 6),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: SafeJetColors.warning.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'Testnet',
                          style: TextStyle(
                            color: SafeJetColors.warning,
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          
          // Balance
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                amount.toStringAsFixed(4),
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              _buildAssetBalance(
                _formatBalance(_showInUSD, fiatValue),
                isDark,
              ),
              // Add price change indicator
              if (changePercent24h != 0)
                Text(
                  '${changePercent24h >= 0 ? '+' : ''}${changePercent24h.toStringAsFixed(2)}%',
                  style: TextStyle(
                    color: changePercent24h >= 0 ? Colors.green : Colors.red,
                    fontSize: 12,
                  ),
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

  String _getBalanceTitle() {
    switch (_selectedFilter) {
      case 'Spot':
        return 'Spot Balance';
      case 'Funding':
        return 'Fund Balance';
      default:
        return 'Portfolio Value';
    }
  }

  String _formatPriceChange(double value) {
    if (value.abs() >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(2)}M';
    } else if (value.abs() >= 1000) {
      return '${(value / 1000).toStringAsFixed(2)}K';
    }
    return value.toStringAsFixed(2);
  }

  Widget _buildPriceChange() {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: _isPriceLoading
          ? Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 6,
              ),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.grey),
                ),
              ),
            )
          : Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 6,
              ),
              decoration: BoxDecoration(
                color: (_changePercent24h >= 0 ? SafeJetColors.success : SafeJetColors.error).withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    _changePercent24h >= 0 
                        ? Icons.trending_up_rounded 
                        : Icons.trending_down_rounded,
                    color: _changePercent24h >= 0 
                        ? SafeJetColors.success 
                        : SafeJetColors.error,
                    size: 16,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${_changePercent24h >= 0 ? '+' : ''}${_getCurrencySymbol(_showInUSD ? 'USD' : _userCurrency)}${_formatPriceChange(_change24h.abs())} '
                    '(${_changePercent24h.toStringAsFixed(2)}%)',
                    style: TextStyle(
                      color: _changePercent24h >= 0 
                          ? SafeJetColors.success 
                          : SafeJetColors.error,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  void _setupScrollController() {
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >= 
          _scrollController.position.maxScrollExtent * 0.8 &&
          !_isLoadingMore &&
          _hasMoreData) {
        _loadMoreBalances();
      }
    });
  }

  Future<void> _loadMoreBalances() async {
    if (!mounted || _isLoadingMore || !_hasMoreData) return;

    setState(() {
      _isLoadingMore = true;
    });

    try {
      final type = _selectedFilter == 'All' ? null : _selectedFilter.toLowerCase();
      final data = await _walletService.getBalances(
        type: type,
        currency: _showInUSD ? 'USD' : _userCurrency,
        page: _currentPage + 1,
        limit: _pageSize,
      );

      if (!mounted) return;

      final newBalances = List<Map<String, dynamic>>.from(data['balances'] ?? []);
      
      if (newBalances.isEmpty) {
        setState(() {
          _hasMoreData = false;
          _isLoadingMore = false;
        });
        return;
      }

      setState(() {
        if (_selectedFilter == 'All') {
          // Handle combining balances for All filter
          final Map<String, Map<String, dynamic>> combinedBalances = 
              Map.fromEntries(_balances.map((b) => 
                  MapEntry(b['token']['symbol'] as String, b)));

          for (final balance in newBalances) {
            final token = balance['token'] as Map<String, dynamic>;
            final symbol = token['symbol'] as String;
            final currentBalance = double.tryParse(balance['balance'] as String) ?? 0.0;

            if (combinedBalances.containsKey(symbol)) {
              final existingBalance = double.tryParse(
                  combinedBalances[symbol]!['balance'] as String) ?? 0.0;
              combinedBalances[symbol]!['balance'] = 
                  (existingBalance + currentBalance).toString();
            } else {
              combinedBalances[symbol] = {
                ...balance,
                'token': token,
              };
            }
          }

          _balances = _sortBalances(combinedBalances.values.toList());
        } else {
          _balances.addAll(newBalances);
          _balances = _sortBalances(_balances);
        }

        _currentPage++;
        _isLoadingMore = false;
      });

      // Update token prices
      final newPrices = Map<String, double>.fromEntries(
        newBalances.map((b) => MapEntry(
          b['token']['symbol'] as String,
          (b['price'] ?? 0.0).toDouble(),
        )),
      );
      _tokenPrices.addAll(newPrices);

    } catch (e) {
      print('Error loading more balances: $e');
      if (!mounted) return;
      
      setState(() {
        _isLoadingMore = false;
        _hasMoreData = false;
      });
    }
  }

  // Add this method to handle immediate currency conversion
  void _updateCurrencyDisplay(bool showInUSD) {
    setState(() {
      _showInUSD = showInUSD;
      // Use stored USD values for conversion
      _totalBalance = showInUSD ? _usdBalance : _usdBalance * _userCurrencyRate;
      _change24h = showInUSD ? _usdChange24h : _usdChange24h * _userCurrencyRate;
    });
  }

  // Add this method to filter balances
  List<Map<String, dynamic>> _getFilteredBalances() {
    return _balances.where((balance) {
      // First check balance if zero balances are hidden
      if (!_showZeroBalances) {
        final amount = double.tryParse(balance['balance']?.toString() ?? '0') ?? 0.0;
        if (amount <= 0) return false;
      }

      // Then apply search filter if there's a search query
      if (_searchQuery.isNotEmpty) {
        final token = balance['token'] as Map<String, dynamic>;
        final name = (token['name'] as String).toLowerCase();
        final symbol = (token['symbol'] as String).toLowerCase();
        final query = _searchQuery.toLowerCase();

        // Check if either name or symbol contains the search query
        return name.contains(query) || symbol.contains(query);
      }

      return true;
    }).toList();
  }
} 