import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'dart:math' show sin;
import '../../../config/theme/colors.dart';
import '../../../widgets/mini_chart_painter.dart';
import '../../../widgets/mini_sparkline_painter.dart';
import '../../../widgets/portfolio/portfolio_summary_card.dart';
import '../../../widgets/news/news_carousel.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  final List<String> _categories = ['All', 'Favorites', 'Gainers', 'Losers', 'Volume'];
  int _selectedCategoryIndex = 0;
  bool _isRefreshing = false;
  final _searchController = TextEditingController();
  final _refreshKey = GlobalKey<RefreshIndicatorState>();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        key: _refreshKey,
        color: SafeJetColors.secondaryHighlight,
        backgroundColor: isDark ? SafeJetColors.primaryBackground : Colors.white,
        onRefresh: () async {
          setState(() => _isRefreshing = true);
          // TODO: Implement actual refresh logic
          await Future.delayed(const Duration(seconds: 1));
          setState(() => _isRefreshing = false);
        },
        child: CustomScrollView(
          slivers: [
            // Search Bar (moved to top)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: _buildSearchBar(),
              ),
            ),
            
            // Portfolio Summary Card
            SliverToBoxAdapter(
              child: PortfolioSummaryCard(),
            ),
            
            // Market Overview Card
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
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Total Market Cap',
                                style: theme.textTheme.bodyMedium,
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Text(
                                    '\$1.23T',
                                    style: theme.textTheme.headlineMedium?.copyWith(
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
                                ],
                              ),
                            ],
                          ),
                          _buildMiniChart(),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: _buildQuickStat(
                              'BTC Dom.',
                              '43.2%',
                              Icons.pie_chart_rounded,
                              isDark,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildQuickStat(
                              '24h Vol.',
                              '\$84.2B',
                              Icons.bar_chart_rounded,
                              isDark,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildQuickStat(
                              'Pairs',
                              '12,234',
                              Icons.currency_exchange_rounded,
                              isDark,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // News & Updates Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(top: 24, bottom: 24),
                child: NewsCarousel(isDark: isDark),
              ),
            ),

            // Trending Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Trending',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            // TODO: Show all trending
                          },
                          child: Row(
                            children: [
                              Text(
                                'See All',
                                style: TextStyle(
                                  color: SafeJetColors.secondaryHighlight,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.arrow_forward_rounded,
                                color: SafeJetColors.secondaryHighlight,
                                size: 16,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 160,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: 5,
                        itemBuilder: (context, index) => _buildTrendingCoinCard(),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Categories
            SliverToBoxAdapter(
              child: Container(
                height: 50,
                margin: const EdgeInsets.symmetric(vertical: 24),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _categories.length,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemBuilder: (context, index) => _buildCategoryChip(index),
                ),
              ),
            ),

            // Market List
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _buildMarketListItem(index),
                  childCount: 10,
                ),
              ),
            ),

            // Bottom Padding for nav bar
            const SliverPadding(
              padding: EdgeInsets.only(bottom: 100),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMiniChart() {
    // TODO: Implement actual chart
    return Container(
      width: 100,
      height: 50,
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: CustomPaint(
        painter: MiniChartPainter(),
      ),
    );
  }

  Widget _buildQuickStat(String label, String value, IconData icon, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
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
        children: [
          Icon(
            icon,
            color: SafeJetColors.secondaryHighlight,
            size: 20,
          ),
          const SizedBox(height: 8),
          FittedBox(
            child: Text(
              value,
              style: TextStyle(
                color: isDark ? Colors.white : SafeJetColors.lightText,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            child: Text(
              label,
              style: TextStyle(
                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendingCoinCard() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 16),
      padding: const EdgeInsets.all(16),
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
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      SafeJetColors.secondaryHighlight,
                      SafeJetColors.secondaryHighlight.withOpacity(0.8),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.currency_bitcoin, color: Colors.black),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'BTC',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Bitcoin',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '\$42,384.21',
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
    );
  }

  Widget _buildCategoryChip(int index) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isSelected = _selectedCategoryIndex == index;

    return GestureDetector(
      onTap: () => setState(() => _selectedCategoryIndex = index),
      child: Container(
        margin: const EdgeInsets.only(right: 12),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? SafeJetColors.secondaryHighlight
              : (isDark
                  ? SafeJetColors.primaryAccent.withOpacity(0.1)
                  : SafeJetColors.lightCardBackground),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? SafeJetColors.secondaryHighlight
                : (isDark
                    ? SafeJetColors.primaryAccent.withOpacity(0.2)
                    : SafeJetColors.lightCardBorder),
          ),
        ),
        child: Text(
          _categories[index],
          style: TextStyle(
            color: isSelected
                ? Colors.black
                : (isDark ? Colors.white : SafeJetColors.lightText),
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildMarketListItem(int index) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
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
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bitcoin',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  'BTC',
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          
          // Price Info
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '\$42,384.21',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
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
          ),

          // Sparkline Chart
          const SizedBox(width: 12),
          SizedBox(
            width: 80,
            height: 40,
            child: CustomPaint(
              painter: MiniSparklinePainter(
                data: _generateDummyData(),
                color: SafeJetColors.success,
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<double> _generateDummyData() {
    return List.generate(20, (i) => 0.5 + 0.5 * sin(i * 0.5));
  }

  Widget _buildSearchBar() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      height: 56,
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
          const SizedBox(width: 16),
          Icon(
            Icons.search_rounded,
            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: _searchController,
              style: theme.textTheme.bodyLarge,
              decoration: InputDecoration(
                hintText: 'Search coins...',
                hintStyle: theme.textTheme.bodyMedium?.copyWith(
                  color: isDark ? Colors.grey[600] : SafeJetColors.lightTextSecondary,
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 16),
                isDense: true,
              ),
              onChanged: (value) {
                // TODO: Implement search functionality
              },
            ),
          ),
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: Icon(
                Icons.close_rounded,
                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                size: 20,
              ),
              onPressed: () {
                setState(() {
                  _searchController.clear();
                });
              },
            ),
          const SizedBox(width: 8),
          Container(
            height: 56,
            width: 56,
            decoration: BoxDecoration(
              color: isDark 
                  ? SafeJetColors.primaryAccent.withOpacity(0.1)
                  : SafeJetColors.lightCardBackground.withOpacity(0.8),
              borderRadius: const BorderRadius.horizontal(right: Radius.circular(16)),
              border: Border(
                left: BorderSide(
                  color: isDark
                      ? SafeJetColors.primaryAccent.withOpacity(0.2)
                      : SafeJetColors.lightCardBorder,
                ),
              ),
            ),
            child: IconButton(
              icon: Icon(
                Icons.tune_rounded,
                color: isDark ? Colors.white : SafeJetColors.lightText,
                size: 24,
              ),
              onPressed: () {
                // TODO: Show filter options
              },
            ),
          ),
        ],
      ),
    );
  }
} 