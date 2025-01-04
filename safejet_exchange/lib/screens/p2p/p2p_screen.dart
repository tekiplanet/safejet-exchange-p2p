import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/custom_app_bar.dart';
import 'p2p_offer_details_screen.dart';
import 'p2p_order_history_screen.dart';
import 'p2p_create_offer_screen.dart';

class P2PScreen extends StatefulWidget {
  const P2PScreen({super.key});

  @override
  State<P2PScreen> createState() => _P2PScreenState();
}

class _P2PScreenState extends State<P2PScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedCurrency = 'NGN';
  String _selectedCrypto = 'USDT';
  String _selectedPayment = 'All';
  
  final List<String> _fiatCurrencies = ['NGN', 'USD', 'GBP', 'EUR'];
  final List<String> _cryptoCurrencies = ['USDT', 'BTC', 'ETH', 'BUSD'];
  final List<String> _paymentMethods = ['All', 'Bank Transfer', 'PayPal', 'Cash'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'P2P Trading',
        onNotificationTap: () {
          // TODO: Handle notification tap
        },
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
        trailing: IconButton(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const P2POrderHistoryScreen(),
              ),
            );
          },
          icon: const Icon(Icons.history_rounded),
        ),
      ),
      body: Column(
        children: [
          // Buy/Sell Tabs
          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'BUY'),
              Tab(text: 'SELL'),
            ],
            labelColor: SafeJetColors.secondaryHighlight,
            unselectedLabelColor: isDark ? Colors.grey : SafeJetColors.lightTextSecondary,
            indicatorColor: SafeJetColors.secondaryHighlight,
          ),
          
          // Quick Filters
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Fiat Currency Filter
                SizedBox(
                  height: 40,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _fiatCurrencies.length,
                    itemBuilder: (context, index) {
                      final currency = _fiatCurrencies[index];
                      final isSelected = currency == _selectedCurrency;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              if (!isSelected) {
                                setState(() => _selectedCurrency = currency);
                              }
                            },
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              decoration: BoxDecoration(
                                color: isSelected 
                                    ? SafeJetColors.secondaryHighlight
                                    : isDark
                                        ? Colors.white.withOpacity(0.05)  // Very subtle white for dark mode
                                        : Colors.black.withOpacity(0.05), // Very subtle black for light mode
                                borderRadius: BorderRadius.circular(20),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                currency,
                                style: TextStyle(
                                  color: isSelected
                                      ? Colors.black
                                      : isDark
                                          ? Colors.white
                                          : SafeJetColors.lightText,
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),
                // Filter Row
                Row(
                  children: [
                    // Crypto Dropdown
                    Expanded(
                      flex: 2,
                      child: _buildFilterButton(
                        _selectedCrypto,
                        isDark,
                        onTap: () => _showFilterOptions(
                          context,
                          'Select Crypto',
                          _cryptoCurrencies,
                          _selectedCrypto,
                          (value) => setState(() => _selectedCrypto = value),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Payment Method Dropdown
                    Expanded(
                      flex: 3,
                      child: _buildFilterButton(
                        _selectedPayment,
                        isDark,
                        onTap: () => _showFilterOptions(
                          context,
                          'Payment Method',
                          _paymentMethods,
                          _selectedPayment,
                          (value) => setState(() => _selectedPayment = value),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Filter Button
                    Container(
                      height: 40,
                      width: 40,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.05)
                            : Colors.black.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: IconButton(
                        icon: Icon(
                          Icons.tune_rounded,
                          color: isDark ? Colors.white : SafeJetColors.lightText,
                          size: 20,
                        ),
                        onPressed: () {
                          // TODO: Show advanced filters
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Expanded TabBarView
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildOffersList(isDark, isBuy: true),
                _buildOffersList(isDark, isBuy: false),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const P2PCreateOfferScreen(),
            ),
          );
        },
        backgroundColor: SafeJetColors.secondaryHighlight,
        label: const Text('Create Offer'),
        icon: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildOffersList(bool isDark, {required bool isBuy}) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 10, // Dummy count
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _buildOfferCard(isDark, isBuy),
        );
      },
    );
  }

  Widget _buildOfferCard(bool isDark, bool isBuy) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => P2POfferDetailsScreen(
                  isBuy: isBuy,
                  // We'll add more parameters later
                ),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: SafeJetColors.secondaryHighlight,
                          child: const Text('JS'),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'JohnSeller',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '245 orders • 98.5%',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark
                                    ? Colors.grey[400]
                                    : SafeJetColors.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: isBuy
                            ? SafeJetColors.success.withOpacity(0.2)
                            : SafeJetColors.warning.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isBuy ? 'BUYING' : 'SELLING',
                        style: TextStyle(
                          color: isBuy
                              ? SafeJetColors.success
                              : SafeJetColors.warning,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Price',
                          style: TextStyle(
                            color: isDark
                                ? Colors.grey[400]
                                : SafeJetColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          '₦750.00',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Available',
                          style: TextStyle(
                            color: isDark
                                ? Colors.grey[400]
                                : SafeJetColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          '1,234.56 USDT',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  children: [
                    _buildPaymentTag('Bank Transfer', isDark),
                    _buildPaymentTag('PayPal', isDark),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterButton(String text, bool isDark, {required VoidCallback onTap}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          height: 40,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withOpacity(0.05)
                : Colors.black.withOpacity(0.05),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  text,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.white : SafeJetColors.lightText,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.keyboard_arrow_down_rounded,
                color: isDark ? Colors.white : SafeJetColors.lightText,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentTag(String text, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 8,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark
              ? SafeJetColors.primaryAccent.withOpacity(0.2)
              : SafeJetColors.lightCardBorder,
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          color: isDark ? Colors.white : SafeJetColors.lightText,
        ),
      ),
    );
  }

  void _showFilterOptions(
    BuildContext context,
    String title,
    List<String> options,
    String selectedValue,
    Function(String) onSelect,
  ) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...options.map((option) => ListTile(
              title: Text(option),
              trailing: option == selectedValue
                  ? Icon(
                      Icons.check,
                      color: SafeJetColors.secondaryHighlight,
                    )
                  : null,
              onTap: () {
                onSelect(option);
                Navigator.pop(context);
              },
            )),
          ],
        ),
      ),
    );
  }
} 