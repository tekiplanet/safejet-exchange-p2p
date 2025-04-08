import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import '../../services/home_service.dart';
import '../../services/service_locator.dart';
import '../../services/p2p_settings_service.dart';
import '../../services/exchange_service.dart';
import 'dart:async';

class PortfolioSummaryCard extends StatefulWidget {
  const PortfolioSummaryCard({super.key});

  @override
  State<PortfolioSummaryCard> createState() => _PortfolioSummaryCardState();
}

class _PortfolioSummaryCardState extends State<PortfolioSummaryCard> {
  String _selectedCurrency = 'USD';
  final List<String> _currencies = ['USD', 'BTC', 'NGN'];
  
  final HomeService _homeService = getIt<HomeService>();
  final P2PSettingsService _p2pSettingsService = getIt<P2PSettingsService>();
  final ExchangeService _exchangeService = getIt<ExchangeService>();
  
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  Map<String, dynamic> _portfolioData = {};
  
  double _totalUsdValue = 0.0;
  double _spotUsdValue = 0.0;
  double _fundingUsdValue = 0.0;
  double _changePercent = 0.0;
  String _userCurrency = 'USD';
  double _userCurrencyRate = 1.0;
  bool _showInUSD = true;
  
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadUserSettings();
    _loadPortfolioData();
    
    // Set up periodic refresh
    _refreshTimer = Timer.periodic(const Duration(minutes: 2), (_) {
      if (mounted) {
        _loadPortfolioData(showLoading: false);
      }
    });
  }
  
  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
  
  Future<void> _loadUserSettings() async {
    try {
      final settings = await _p2pSettingsService.getSettings();
      final currency = settings['currency'] ?? 'USD';
      
      if (currency != 'USD') {
        final rates = await _exchangeService.getRates(currency);
        setState(() {
          _userCurrency = currency;
          _currencies[2] = currency; // Replace NGN with user's currency
          _userCurrencyRate = double.tryParse(rates['rate']?.toString() ?? '1') ?? 1.0;
        });
      }
    } catch (e) {
      print('Error loading user settings: $e');
      // Default to USD if there's an error
    }
  }

  Future<void> _loadPortfolioData({bool showLoading = true}) async {
    if (showLoading && mounted) {
      setState(() {
        _isLoading = true;
        _hasError = false;
      });
    }
    
    try {
      final data = await _homeService.getPortfolioSummary(
        currency: _selectedCurrency,
        timeframe: '24h',
      );
      
      if (mounted) {
        setState(() {
          _portfolioData = data;
          _isLoading = false;
          
          // Extract and store values for easy access
          final portfolio = data['portfolio'] ?? {};
          _totalUsdValue = double.tryParse(portfolio['usdValue']?.toString() ?? '0') ?? 0.0;
          
          final change = portfolio['change'] ?? {};
          _changePercent = double.tryParse(change['percent']?.toString() ?? '0') ?? 0.0;
          
          // Use the totals directly from the API response
          final spotBalances = data['spotBalances'] ?? {};
          final fundingBalances = data['fundingBalances'] ?? {};
          
          _spotUsdValue = double.tryParse(spotBalances['total']?.toString() ?? '0') ?? 0.0;
          _fundingUsdValue = double.tryParse(fundingBalances['total']?.toString() ?? '0') ?? 0.0;
        });
      }
    } catch (e) {
      print('Error loading portfolio data: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
          _errorMessage = e.toString();
        });
      }
    }
  }
  
  void _updateCurrencyDisplay(bool showInUSD) {
    setState(() {
      _showInUSD = showInUSD;
    });
  }

  String _formatCurrency(double value) {
    final currency = _showInUSD ? 'USD' : _userCurrency;
    final amount = _showInUSD ? value : value * _userCurrencyRate;
    
    return _homeService.formatCurrency(amount, currency);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isLoading) {
      return _buildLoadingState(isDark);
    }
    
    if (_hasError) {
      return _buildErrorState(isDark);
    }

    return FadeInDown(
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
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildHeader(theme, isDark),
            const SizedBox(height: 20),
            _buildBalanceBreakdown(isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme, bool isDark) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Portfolio Balance',
              style: theme.textTheme.bodyMedium,
            ),
            _buildCurrencySelector(isDark),
          ],
        ),
        const SizedBox(height: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _formatCurrency(_totalUsdValue),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: (_changePercent >= 0 ? SafeJetColors.success : SafeJetColors.error).withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _changePercent >= 0 ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                    color: _changePercent >= 0 ? SafeJetColors.success : SafeJetColors.error,
                    size: 16,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${_changePercent >= 0 ? '+' : ''}${_changePercent.toStringAsFixed(2)}%',
                    style: TextStyle(
                      color: _changePercent >= 0 ? SafeJetColors.success : SafeJetColors.error,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCurrencySelector(bool isDark) {
    // If user currency is USD, don't show a toggle
    if (_userCurrency.toUpperCase() == 'USD') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
        child: DropdownButton<String>(
          value: _selectedCurrency,
          icon: const Icon(Icons.keyboard_arrow_down),
          iconSize: 16,
          elevation: 16,
          style: TextStyle(
            color: isDark ? Colors.white : SafeJetColors.lightText,
            fontWeight: FontWeight.bold,
          ),
          underline: Container(),
          onChanged: (String? newValue) {
            setState(() {
              _selectedCurrency = newValue!;
              _loadPortfolioData();
            });
          },
          items: _currencies.map<DropdownMenuItem<String>>((String value) {
            return DropdownMenuItem<String>(
              value: value,
              child: Text(value),
            );
          }).toList(),
        ),
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

  Widget _buildBalanceBreakdown(bool isDark) {
    return Column(
      children: [
        _buildBalanceRow('Spot Balance', _spotUsdValue, isDark),
        const SizedBox(height: 12),
        _buildBalanceRow('Funding Balance', _fundingUsdValue, isDark),
      ],
    );
  }

  Widget _buildBalanceRow(String label, double value, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDark ? Colors.white70 : SafeJetColors.lightTextSecondary,
            ),
          ),
          Text(
            _formatCurrency(value),
            style: TextStyle(
              color: isDark ? Colors.white : SafeJetColors.lightText,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildLoadingState(bool isDark) {
    return Container(
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
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              'Loading portfolio data...',
              style: TextStyle(
                color: isDark ? Colors.white70 : SafeJetColors.lightTextSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildErrorState(bool isDark) {
    return Container(
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
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              color: SafeJetColors.error,
              size: 40,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load portfolio data',
              style: TextStyle(
                color: isDark ? Colors.white : SafeJetColors.lightText,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage,
              style: TextStyle(
                color: isDark ? Colors.white70 : SafeJetColors.lightTextSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadPortfolioData,
              style: ElevatedButton.styleFrom(
                backgroundColor: SafeJetColors.secondaryHighlight,
                foregroundColor: Colors.black,
              ),
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
} 