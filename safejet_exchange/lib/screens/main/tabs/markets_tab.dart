import 'package:flutter/material.dart';
import '../../../config/theme/colors.dart';
import 'package:animate_do/animate_do.dart';

class MarketsTab extends StatefulWidget {
  const MarketsTab({super.key});

  @override
  State<MarketsTab> createState() => _MarketsTabState();
}

class _MarketsTabState extends State<MarketsTab> {
  String _selectedCategory = 'Spot';
  final List<String> _categories = ['Spot', 'Futures', 'New'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return SafeArea(
      child: Column(
        children: [
          // Search Bar
          FadeInDown(
            duration: const Duration(milliseconds: 600),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                height: 48,
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
                  style: theme.textTheme.bodyLarge,
                  decoration: InputDecoration(
                    hintText: 'Search coin',
                    hintStyle: TextStyle(
                      color: isDark ? Colors.grey[600] : SafeJetColors.lightTextSecondary,
                    ),
                    prefixIcon: Icon(
                      Icons.search,
                      color: isDark ? Colors.grey[600] : Colors.grey[400],
                      size: 20,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    isDense: true,
                  ),
                ),
              ),
            ),
          ),

          // Category Selector
          FadeInDown(
            duration: const Duration(milliseconds: 600),
            delay: const Duration(milliseconds: 200),
            child: Container(
              height: 40,
              margin: const EdgeInsets.symmetric(horizontal: 16),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final isSelected = _categories[index] == _selectedCategory;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedCategory = _categories[index]),
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
                },
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Column Headers
          FadeInDown(
            duration: const Duration(milliseconds: 600),
            delay: const Duration(milliseconds: 300),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      'Pair',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      'Price',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      '24h Change',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Market Pairs List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: 20, // Replace with actual data
              itemBuilder: (context, index) => FadeInDown(
                duration: const Duration(milliseconds: 600),
                delay: Duration(milliseconds: 400 + (index * 100)),
                child: InkWell(
                  onTap: () {
                    // TODO: Navigate to trading pair
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: isDark
                              ? SafeJetColors.primaryAccent.withOpacity(0.2)
                              : SafeJetColors.lightCardBorder,
                        ),
                      ),
                    ),
                    child: Row(
                      children: [
                        // Pair Info
                        Expanded(
                          flex: 2,
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: SafeJetColors.secondaryHighlight,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.currency_bitcoin,
                                  color: Colors.black,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'BTC/USDT',
                                    style: theme.textTheme.bodyLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    'Bitcoin',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        
                        // Price
                        Expanded(
                          child: Text(
                            '\$42,384.21',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.right,
                          ),
                        ),
                        
                        // 24h Change
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: (index % 2 == 0 ? SafeJetColors.success : SafeJetColors.error)
                                  .withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              index % 2 == 0 ? '+2.34%' : '-1.23%',
                              style: TextStyle(
                                color: index % 2 == 0 ? SafeJetColors.success : SafeJetColors.error,
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.right,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
