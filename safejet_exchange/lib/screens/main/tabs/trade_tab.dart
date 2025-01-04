import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import '../../../config/theme/colors.dart';
import '../../../widgets/candlestick_chart.dart';
import '../../../widgets/order_book.dart';
import '../../../widgets/trade_form.dart';
import 'package:sliding_up_panel/sliding_up_panel.dart';
import '../../../widgets/trading_pair_selector.dart';

class TradeTab extends StatefulWidget {
  const TradeTab({super.key});

  @override
  State<TradeTab> createState() => _TradeTabState();
}

class _TradeTabState extends State<TradeTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _timeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
  int _selectedTimeframe = 3; // Default to 1h
  final PanelController _panelController = PanelController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return SafeArea(
      child: SlidingUpPanel(
        controller: _panelController,
        minHeight: 60,
        maxHeight: MediaQuery.of(context).size.height * 0.7,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        backdropEnabled: true,
        backdropColor: Colors.black,
        backdropOpacity: 0.5,
        color: isDark 
            ? SafeJetColors.primaryBackground
            : SafeJetColors.lightBackground,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
        panel: _buildOrderBookPanel(isDark, theme),
        body: Column(
          children: [
            // Trading Pair Header (Fixed at top)
            _buildTradingPairHeader(theme, isDark),
            
            // Scrollable Content
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                physics: const ClampingScrollPhysics(),
                children: [
                  // Timeframe Selection
                  FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    child: _buildTimeframeSelector(isDark),
                  ),

                  // Chart
                  FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    delay: const Duration(milliseconds: 200),
                    child: Container(
                      height: 250,
                      margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                      decoration: BoxDecoration(
                        color: isDark 
                            ? SafeJetColors.primaryAccent.withOpacity(0.1)
                            : SafeJetColors.lightCardBackground,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isDark
                              ? SafeJetColors.primaryAccent.withOpacity(0.2)
                              : SafeJetColors.lightCardBorder,
                        ),
                      ),
                      child: const CandlestickChart(),
                    ),
                  ),

                  // Trading Interface
                  FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    delay: const Duration(milliseconds: 300),
                    child: Container(
                      height: 600,
                      margin: EdgeInsets.fromLTRB(
                        16, 
                        0, 
                        16, 
                        MediaQuery.of(context).size.height * 0.15, // 10% of screen height for bottom margin
                      ),
                      decoration: BoxDecoration(
                        color: isDark 
                            ? SafeJetColors.primaryAccent.withOpacity(0.1)
                            : SafeJetColors.lightCardBackground,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(20),
                        ),
                        border: Border.all(
                          color: isDark
                              ? SafeJetColors.primaryAccent.withOpacity(0.2)
                              : SafeJetColors.lightCardBorder,
                        ),
                      ),
                      child: Column(
                        children: [
                          // Buy/Sell Tabs
                          TabBar(
                            controller: _tabController,
                            tabs: [
                              Tab(text: 'Buy BTC'),
                              Tab(text: 'Sell BTC'),
                            ],
                            labelColor: SafeJetColors.secondaryHighlight,
                            unselectedLabelColor: isDark 
                                ? Colors.grey[400]
                                : SafeJetColors.lightTextSecondary,
                            indicatorColor: SafeJetColors.secondaryHighlight,
                          ),
                          
                          // Trading Form
                          Expanded(
                            child: TabBarView(
                              controller: _tabController,
                              children: const [
                                TradeForm(isBuy: true),
                                TradeForm(isBuy: false),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Keep the bottom padding
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTradingPairHeader(ThemeData theme, bool isDark) {
    return GestureDetector(
      onTap: () async {
        // Show trading pair selector
        final result = await showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (context) => const TradingPairSelector(),
        );
        
        // Handle selected pair
        if (result != null) {
          // TODO: Update trading pair
          print(result);
        }
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark 
              ? SafeJetColors.primaryBackground
              : SafeJetColors.lightBackground,
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: SafeJetColors.secondaryHighlight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.currency_bitcoin,
                color: Colors.black,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'BTC/USDT',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      '\$42,384.21',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: SafeJetColors.success,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: SafeJetColors.success.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '+2.34%',
                        style: TextStyle(
                          color: SafeJetColors.success,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeframeSelector(bool isDark) {
    return Container(
      height: 40,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _timeframes.length,
        itemBuilder: (context, index) {
          final isSelected = index == _selectedTimeframe;
          return GestureDetector(
            onTap: () => setState(() => _selectedTimeframe = index),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16),
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
              alignment: Alignment.center,
              child: Text(
                _timeframes[index],
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
    );
  }

  Widget _buildOrderBookPanel(bool isDark, ThemeData theme) {
    return Column(
      children: [
        // Panel Header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isDark
                    ? SafeJetColors.primaryAccent.withOpacity(0.2)
                    : SafeJetColors.lightCardBorder,
              ),
            ),
          ),
          child: Column(
            children: [
              // Drag Handle
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // Header Content
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Order Book',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Row(
                    children: [
                      _buildPrecisionButton('0.1', true, isDark),
                      const SizedBox(width: 8),
                      _buildPrecisionButton('0.01', false, isDark),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),

        // Order Book Content
        Expanded(
          child: OrderBook(),
        ),
      ],
    );
  }

  Widget _buildPrecisionButton(String text, bool isSelected, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isSelected
            ? SafeJetColors.secondaryHighlight
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: isSelected
              ? Colors.black
              : (isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary),
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
    );
  }
} 