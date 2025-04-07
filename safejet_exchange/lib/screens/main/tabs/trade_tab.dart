import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import '../../../config/theme/colors.dart';
import '../../../widgets/candlestick_chart.dart';
import '../../../widgets/order_book.dart';
import '../../../widgets/trade_form.dart';
import 'package:sliding_up_panel/sliding_up_panel.dart';
import '../../../widgets/trading_pair_selector.dart';
import '../../../screens/p2p/p2p_screen.dart';

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
  
  // Coming soon feature flag
  final bool comingSoon = true;

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
      child: Stack(
        children: [
          // Background when comingSoon is true but no original content is visible
          if (comingSoon)
            Container(
              color: isDark ? SafeJetColors.primaryBackground : SafeJetColors.lightBackground,
            ),
          
          // Original content - only shown when comingSoon is false
          if (!comingSoon)
            SlidingUpPanel(
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
          
          // Coming soon overlay - displayed on top of everything when comingSoon is true
          if (comingSoon)
            _buildComingSoonOverlay(context, isDark),
        ],
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

  // Build the coming soon overlay
  Widget _buildComingSoonOverlay(BuildContext context, bool isDark) {
    return Positioned.fill(
      child: Container(
        color: isDark 
            ? Colors.black.withOpacity(0.98)
            : Colors.white.withOpacity(0.98),
        child: FadeInUp(
          duration: const Duration(milliseconds: 800),
          child: SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 20),
                    
                    // Coming soon icon/image
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.rocket_launch,
                        color: SafeJetColors.secondaryHighlight,
                        size: 64,
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // Title text
                    Text(
                      "Spot & Futures Trading",
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    
                    // Coming soon badge
                    Container(
                      margin: const EdgeInsets.symmetric(vertical: 16),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: SafeJetColors.secondaryHighlight,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        "COMING SOON",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                        ),
                      ),
                    ),
                    
                    // Description text
                    Text(
                      "We're putting the finishing touches on our advanced trading platform. "
                      "You'll be the first to know when it launches!",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 16,
                        color: isDark ? Colors.grey[300] : Colors.grey[800],
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 20),
                    
                    // Divider with text
                    Row(
                      children: [
                        Expanded(
                          child: Divider(
                            color: isDark ? Colors.grey[700] : Colors.grey[300],
                            thickness: 1,
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            "MEANWHILE",
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                        ),
                        Expanded(
                          child: Divider(
                            color: isDark ? Colors.grey[700] : Colors.grey[300],
                            thickness: 1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    
                    // P2P suggestion text
                    Text(
                      "Why not try our thriving P2P marketplace?",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // P2P benefits text
                    Text(
                      "Connect directly with hundreds of traders, enjoy flexible payment options, and trade your assets with zero platform fees!",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 16,
                        color: isDark ? Colors.grey[300] : Colors.grey[800],
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // CTA button
                    ElevatedButton(
                      onPressed: () {
                        // Navigate to P2P screen
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
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        "Explore P2P Marketplace",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Get notified text
                    Text(
                      "We'll notify you as soon as trading is live!",
                      style: TextStyle(
                        fontSize: 14,
                        fontStyle: FontStyle.italic,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
} 