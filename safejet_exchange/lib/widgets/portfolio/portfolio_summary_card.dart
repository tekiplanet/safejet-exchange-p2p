import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import 'package:fl_chart/fl_chart.dart';
import './portfolio_chart.dart';
import './allocation_chart.dart';

class PortfolioSummaryCard extends StatefulWidget {
  const PortfolioSummaryCard({super.key});

  @override
  State<PortfolioSummaryCard> createState() => _PortfolioSummaryCardState();
}

class _PortfolioSummaryCardState extends State<PortfolioSummaryCard> {
  bool _isExpanded = false;
  String _selectedCurrency = 'USD';
  String _selectedTimeframe = '24h';
  
  final List<String> _currencies = ['USD', 'BTC', 'NGN'];
  final List<String> _timeframes = ['24h', '7d', '30d'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return FadeInDown(
      duration: const Duration(milliseconds: 600),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
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
            if (_isExpanded) ...[
              const SizedBox(height: 20),
              SizedBox(
                height: 400,
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    children: [
                      _buildPortfolioChart(isDark),
                      const SizedBox(height: 20),
                      _buildAllocationChart(isDark),
                      const SizedBox(height: 20),
                      _buildQuickActions(isDark),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ],
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
            Row(
              children: [
                _buildCurrencySelector(isDark),
                const SizedBox(width: 8),
                IconButton(
                  icon: Icon(
                    _isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: isDark ? Colors.white : SafeJetColors.lightText,
                  ),
                  onPressed: () => setState(() => _isExpanded = !_isExpanded),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildBalanceText(_selectedCurrency),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: SafeJetColors.success.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.arrow_upward_rounded,
                        color: SafeJetColors.success,
                        size: 16,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '2.3%',
                        style: TextStyle(
                          color: SafeJetColors.success,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_isExpanded)
                  _buildTimeframeSelector(isDark),
              ],
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCurrencySelector(bool isDark) {
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

  Widget _buildTimeframeSelector(bool isDark) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: _timeframes.map((timeframe) {
        final isSelected = timeframe == _selectedTimeframe;
        return GestureDetector(
          onTap: () => setState(() => _selectedTimeframe = timeframe),
          child: Container(
            margin: const EdgeInsets.only(left: 4),
            padding: const EdgeInsets.symmetric(
              horizontal: 8,
              vertical: 4,
            ),
            decoration: BoxDecoration(
              color: isSelected
                  ? SafeJetColors.secondaryHighlight
                  : (isDark
                      ? SafeJetColors.primaryAccent.withOpacity(0.1)
                      : SafeJetColors.lightCardBackground),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isSelected
                    ? SafeJetColors.secondaryHighlight
                    : (isDark
                        ? SafeJetColors.primaryAccent.withOpacity(0.2)
                        : SafeJetColors.lightCardBorder),
              ),
            ),
            child: Text(
              timeframe,
              style: TextStyle(
                color: isSelected
                    ? Colors.black
                    : (isDark ? Colors.white : SafeJetColors.lightText),
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontSize: 12,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildBalanceText(String currency) {
    switch (currency) {
      case 'USD':
        return const Text(
          '\$12,345.67',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        );
      case 'BTC':
        return const Text(
          '0.45678 BTC',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        );
      case 'NGN':
        return const Text(
          '₦5,678,901.23',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        );
      default:
        return const Text('');
    }
  }

  Widget _buildPortfolioChart(bool isDark) {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: PortfolioChart(
          isDark: isDark,
          timeframe: _selectedTimeframe,
        ),
      ),
    );
  }

  Widget _buildAllocationChart(bool isDark) {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: AllocationChart(isDark: isDark),
        ),
      ),
    );
  }

  Widget _buildQuickActions(bool isDark) {
    final actions = [
      {'icon': Icons.add, 'label': 'Deposit', 'color': SafeJetColors.success},
      {'icon': Icons.remove, 'label': 'Withdraw', 'color': SafeJetColors.warning},
      {'icon': Icons.swap_horiz, 'label': 'Transfer', 'color': SafeJetColors.info},
      {'icon': Icons.people, 'label': 'P2P', 'color': SafeJetColors.secondaryHighlight},
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: actions.map((action) {
        return Column(
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: action['color'] as Color,
                borderRadius: BorderRadius.circular(15),
              ),
              child: Icon(
                action['icon'] as IconData,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              action['label'] as String,
              style: TextStyle(
                color: isDark ? Colors.white : SafeJetColors.lightText,
                fontSize: 12,
              ),
            ),
          ],
        );
      }).toList(),
    );
  }
} 