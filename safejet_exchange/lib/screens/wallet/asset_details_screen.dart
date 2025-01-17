import 'package:flutter/material.dart';
import '../../config/theme/colors.dart';
import 'package:intl/intl.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:animate_do/animate_do.dart';
import 'package:fl_chart/fl_chart.dart';

class AssetDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> asset;
  final bool showInUSD;
  final double userCurrencyRate;
  final String userCurrency;

  const AssetDetailsScreen({
    super.key,
    required this.asset,
    required this.showInUSD,
    required this.userCurrencyRate,
    required this.userCurrency,
  });

  @override
  _AssetDetailsScreenState createState() => _AssetDetailsScreenState();
}

class _AssetDetailsScreenState extends State<AssetDetailsScreen> {
  String _selectedTimeframe = '24H';
  final List<String> _timeframes = ['1H', '24H', '1W', '1M', '1Y', 'ALL'];

  String _formatBalance(bool showInUSD, double value) {
    final currencySymbol = showInUSD ? '\$' : _getCurrencySymbol(widget.userCurrency);
    
    // Format large numbers with K, M, B
    if (value >= 1000000000) {
      return '$currencySymbol${(value / 1000000000).toStringAsFixed(2)}B';
    } else if (value >= 1000000) {
      return '$currencySymbol${(value / 1000000).toStringAsFixed(2)}M';
    } else if (value >= 1000) {
      return '$currencySymbol${(value / 1000).toStringAsFixed(2)}K';
    }

    // For smaller numbers, use regular currency format
    final numberFormat = NumberFormat.currency(
      locale: 'en_US',
      symbol: currencySymbol,
      decimalDigits: 2,
    );
    return numberFormat.format(value);
  }

  // Helper method to format large numbers (for non-currency values)
  String _formatLargeNumber(double value) {
    if (value >= 1000000000) {
      return '${(value / 1000000000).toStringAsFixed(2)}B';
    } else if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(2)}M';
    } else if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(2)}K';
    }
    return value.toStringAsFixed(2);
  }

  String _getCurrencySymbol(String currency) {
    switch (currency.toUpperCase()) {
      case 'NGN': return '₦';
      case 'USD': return '\$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return currency;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final token = widget.asset['token'] as Map<String, dynamic>;
    final balance = double.tryParse(widget.asset['balance'].toString()) ?? 0.0;
    final usdValue = double.tryParse(widget.asset['usdValue'].toString()) ?? 0.0;
    final fiatValue = widget.showInUSD ? usdValue : usdValue * widget.userCurrencyRate;
    final changePercent24h = double.tryParse(token['changePercent24h']?.toString() ?? '0') ?? 0.0;

    return Scaffold(
      backgroundColor: isDark ? SafeJetColors.primaryBackground : SafeJetColors.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark ? SafeJetColors.primaryBackground : SafeJetColors.lightBackground,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back,
            color: isDark ? Colors.white : Colors.black,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                image: token['metadata']?['icon'] != null
                    ? DecorationImage(
                        image: NetworkImage(token['metadata']['icon']),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: token['metadata']?['icon'] == null
                  ? Center(
                      child: Text(
                        token['symbol'][0],
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Text(
              token['symbol'],
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              Icons.history,
              color: isDark ? Colors.white : Colors.black,
            ),
            onPressed: () {
              // TODO: Navigate to transaction history
            },
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Column(
              children: [
                // Main Balance Section with Gradient
                FadeInDown(
                  duration: const Duration(milliseconds: 400),
                  child: Container(
                    width: double.infinity,
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: isDark 
                            ? [
                                SafeJetColors.primaryAccent.withOpacity(0.2),
                                SafeJetColors.secondaryHighlight.withOpacity(0.05),
                              ]
                            : [
                                SafeJetColors.secondaryHighlight.withOpacity(0.1),
                                SafeJetColors.primaryAccent.withOpacity(0.05),
                              ],
                      ),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: isDark
                            ? SafeJetColors.primaryAccent.withOpacity(0.2)
                            : SafeJetColors.lightCardBorder,
                      ),
                    ),
                    child: Column(
                      children: [
                        // Price Change Indicator
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: (changePercent24h >= 0 ? SafeJetColors.success : SafeJetColors.error).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                changePercent24h >= 0 ? Icons.trending_up : Icons.trending_down,
                                color: changePercent24h >= 0 ? SafeJetColors.success : SafeJetColors.error,
                                size: 16,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${changePercent24h >= 0 ? '+' : ''}${changePercent24h.toStringAsFixed(2)}%',
                                style: TextStyle(
                                  color: changePercent24h >= 0 ? SafeJetColors.success : SafeJetColors.error,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        
                        // Token Balance
                        Text(
                          balance.toString(),
                          style: theme.textTheme.headlineLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            fontSize: 32,
                          ),
                        ),
                        Text(
                          '≈ ${_formatBalance(widget.showInUSD, fiatValue)}',
                          style: TextStyle(
                            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                            fontSize: 18,
                          ),
                        ),
                        
                        const SizedBox(height: 24),
                        
                        // Available and Frozen Balance
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Available',
                                    style: TextStyle(
                                      color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    balance.toString(),
                                    style: theme.textTheme.titleLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 1,
                              height: 40,
                              color: isDark ? Colors.grey[800] : Colors.grey[300],
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    'Frozen',
                                    style: TextStyle(
                                      color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '0.0000',
                                    style: theme.textTheme.titleLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                // Market Info Card
                FadeInUp(
                  duration: const Duration(milliseconds: 500),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Market Info',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _buildMarketInfoCard(
                                context,
                                'Current Price',
                                _formatBalance(widget.showInUSD, double.parse(token['currentPrice'].toString())),
                                Icons.attach_money,
                                isDark,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildMarketInfoCard(
                                context,
                                '24h Volume',
                                '\$1.2B',
                                Icons.bar_chart,
                                isDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: _buildMarketInfoCard(
                                context,
                                '24h High',
                                _formatBalance(widget.showInUSD, double.parse(token['currentPrice'].toString()) * 1.1),
                                Icons.arrow_upward,
                                isDark,
                                color: SafeJetColors.success,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildMarketInfoCard(
                                context,
                                '24h Low',
                                _formatBalance(widget.showInUSD, double.parse(token['currentPrice'].toString()) * 0.9),
                                Icons.arrow_downward,
                                isDark,
                                color: SafeJetColors.error,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                // Chart Time Selection
                FadeInUp(
                  duration: const Duration(milliseconds: 450),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: _timeframes.map((timeframe) {
                        final isSelected = timeframe == _selectedTimeframe;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _selectedTimeframe = timeframe),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(
                                    color: isSelected
                                        ? (changePercent24h >= 0 ? SafeJetColors.success : SafeJetColors.error)
                                        : Colors.transparent,
                                    width: 2,
                                  ),
                                ),
                              ),
                              child: Text(
                                timeframe,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: isSelected
                                      ? (changePercent24h >= 0 ? SafeJetColors.success : SafeJetColors.error)
                                      : (isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary),
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),

                // Price Chart Section
                FadeInUp(
                  duration: const Duration(milliseconds: 500),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.all(16),
                    height: 200,
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
                    child: LineChart(
                      LineChartData(
                        gridData: FlGridData(show: false),
                        titlesData: FlTitlesData(show: false),
                        borderData: FlBorderData(show: false),
                        lineBarsData: [
                          LineChartBarData(
                            spots: [
                              const FlSpot(0, 3),
                              const FlSpot(2.6, 2),
                              const FlSpot(4.9, 5),
                              const FlSpot(6.8, 3.1),
                              const FlSpot(8, 4),
                              const FlSpot(9.5, 3),
                              const FlSpot(11, 4),
                            ],
                            isCurved: true,
                            gradient: LinearGradient(
                              colors: [
                                changePercent24h >= 0 ? SafeJetColors.success : SafeJetColors.error,
                                (changePercent24h >= 0 ? SafeJetColors.success : SafeJetColors.error).withOpacity(0.3),
                              ],
                            ),
                            barWidth: 2,
                            isStrokeCapRound: true,
                            dotData: FlDotData(show: false),
                            belowBarData: BarAreaData(
                              show: true,
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  (changePercent24h >= 0 ? SafeJetColors.success : SafeJetColors.error).withOpacity(0.2),
                                  (changePercent24h >= 0 ? SafeJetColors.success : SafeJetColors.error).withOpacity(0.0),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Add Price Statistics section
                FadeInUp(
                  duration: const Duration(milliseconds: 550),
                  child: Container(
                    margin: const EdgeInsets.all(16),
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Price Statistics',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        _buildStatisticItem(
                          'Market Cap',
                          _formatBalance(widget.showInUSD, double.tryParse(token['marketCap']?.toString() ?? '0') ?? 0.0),
                          token['marketCapChange24h'] != null 
                              ? '${_formatBalance(widget.showInUSD, double.tryParse(token['marketCapChange24h']?.toString() ?? '0') ?? 0.0)} (${(double.tryParse(token['marketCapChangePercent24h']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}%)'
                              : null,
                          token['marketCapChangePercent24h'] != null && 
                            (double.tryParse(token['marketCapChangePercent24h']?.toString() ?? '0') ?? 0.0) >= 0,
                          isDark,
                        ),
                        _buildStatisticItem(
                          'Fully Diluted Market Cap',
                          _formatBalance(widget.showInUSD, double.tryParse(token['fullyDilutedMarketCap']?.toString() ?? '0') ?? 0.0),
                          null,
                          null,
                          isDark,
                        ),
                        _buildStatisticItem(
                          'Volume (24h)',
                          _formatBalance(widget.showInUSD, double.tryParse(token['volume24h']?.toString() ?? '0') ?? 0.0),
                          token['volumeChangePercent24h'] != null 
                              ? '${(double.tryParse(token['volumeChangePercent24h']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}%'
                              : null,
                          token['volumeChangePercent24h'] != null && 
                            (double.tryParse(token['volumeChangePercent24h']?.toString() ?? '0') ?? 0.0) >= 0,
                          isDark,
                        ),
                        _buildStatisticItem(
                          'Circulating Supply',
                          '${_formatLargeNumber(double.tryParse(token['circulatingSupply']?.toString() ?? '0') ?? 0)} ${token['symbol']}',
                          token['maxSupply'] != null 
                              ? '${((double.tryParse(token['circulatingSupply']?.toString() ?? '0') ?? 0) / (double.tryParse(token['maxSupply']?.toString() ?? '0') ?? 1) * 100).toStringAsFixed(2)}%'
                              : null,
                          null,
                          isDark,
                          isSupply: true,
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Trading Buttons (keep existing buttons)
                // ... existing trading buttons ...

                const SizedBox(height: 100), // Space for bottom nav
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark 
                ? [
                    SafeJetColors.primaryBackground.withOpacity(0.8),
                    SafeJetColors.primaryBackground,
                  ]
                : [
                    SafeJetColors.lightBackground.withOpacity(0.8),
                    SafeJetColors.lightBackground,
                  ],
          ),
          border: Border(
            top: BorderSide(
              color: isDark 
                  ? SafeJetColors.primaryAccent.withOpacity(0.1)
                  : SafeJetColors.lightCardBorder,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: isDark 
                  ? Colors.black.withOpacity(0.2)
                  : Colors.grey.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildAdvancedNavButton(
              context,
              'Deposit',
              Icons.download_rounded,
              SafeJetColors.success,
              () {},
              isDark,
            ),
            _buildAdvancedNavButton(
              context,
              'Withdraw',
              Icons.upload_rounded,
              SafeJetColors.error,
              () {},
              isDark,
            ),
            _buildAdvancedNavButton(
              context,
              'Transfer',
              Icons.swap_horiz_rounded,
              SafeJetColors.primary,
              () {},
              isDark,
            ),
            _buildAdvancedNavButton(
              context,
              'Convert',
              Icons.currency_exchange_rounded,
              SafeJetColors.secondaryHighlight,
              () {},
              isDark,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdvancedNavButton(
    BuildContext context,
    String label,
    IconData icon,
    Color color,
    VoidCallback onPressed,
    bool isDark,
  ) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: color.withOpacity(0.2),
                    width: 1,
                  ),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 24,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionButton(
    BuildContext context,
    String label,
    IconData icon,
    VoidCallback onPressed,
    bool isDark,
  ) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            border: Border.all(
              color: isDark
                  ? SafeJetColors.primaryAccent.withOpacity(0.2)
                  : SafeJetColors.lightCardBorder,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 20,
                color: isDark ? Colors.white : Colors.black,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMarketInfoCard(
    BuildContext context,
    String label,
    String value,
    IconData icon,
    bool isDark, {
    Color? color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: (color ?? SafeJetColors.primaryAccent).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                icon,
                size: 16,
                color: color ?? (isDark ? Colors.white : Colors.black),
              ),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: isDark ? Colors.white : Colors.black,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatisticItem(
    String label,
    String value,
    String? change,
    bool? isPositive,
    bool isDark, {
    bool isSupply = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: isDark 
                ? SafeJetColors.primaryAccent.withOpacity(0.1)
                : SafeJetColors.lightCardBorder,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  value,
                  style: TextStyle(
                    color: isDark ? Colors.white : Colors.black,
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
              ),
              if (change != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: (isPositive == true ? SafeJetColors.success : SafeJetColors.error)
                        .withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    change,
                    style: TextStyle(
                      color: isPositive == true ? SafeJetColors.success : SafeJetColors.error,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
              if (isSupply && change != null)
                Flexible(
                  child: Container(
                    margin: const EdgeInsets.only(left: 8),
                    width: double.infinity,
                    height: 4,
                    decoration: BoxDecoration(
                      color: SafeJetColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(2),
                    ),
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: double.tryParse(change.replaceAll('%', ''))! / 100,
                      child: Container(
                        decoration: BoxDecoration(
                          color: SafeJetColors.primary,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
} 