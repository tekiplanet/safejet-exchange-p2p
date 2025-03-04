import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import '../../services/p2p_service.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';

class P2PMyOffersScreen extends StatefulWidget {
  const P2PMyOffersScreen({super.key});

  @override
  State<P2PMyOffersScreen> createState() => _P2PMyOffersScreenState();
}

class _P2PMyOffersScreenState extends State<P2PMyOffersScreen> {
  final _p2pService = GetIt.I<P2PService>();
  bool _isLoading = false;
  List<Map<String, dynamic>> _buyOffers = [];
  List<Map<String, dynamic>> _sellOffers = [];

  @override
  void initState() {
    super.initState();
    _loadOffers();
  }

  Future<void> _loadOffers() async {
    setState(() => _isLoading = true);
    try {
      final buyOffers = await _p2pService.getMyOffers(true);
      final sellOffers = await _p2pService.getMyOffers(false);
      
      setState(() {
        _buyOffers = buyOffers;
        _sellOffers = sellOffers;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: SafeJetColors.error,
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'My Offers',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: RefreshIndicator(
        onRefresh: _loadOffers,
        color: SafeJetColors.secondaryHighlight,
        child: DefaultTabController(
          length: 2,
          child: Column(
            children: [
              Container(
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: isDark 
                          ? Colors.white.withOpacity(0.1)
                          : Colors.grey[300]!,
                    ),
                  ),
                ),
                child: TabBar(
                  tabs: [
                    Tab(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.shopping_cart_outlined),
                          const SizedBox(width: 8),
                          Text('BUY (${_buyOffers.length})'),
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.sell_outlined),
                          const SizedBox(width: 8),
                          Text('SELL (${_sellOffers.length})'),
                        ],
                      ),
                    ),
                  ],
                  labelColor: SafeJetColors.secondaryHighlight,
                  unselectedLabelColor: isDark ? Colors.grey : SafeJetColors.lightTextSecondary,
                  indicatorColor: SafeJetColors.secondaryHighlight,
                  indicatorWeight: 3,
                ),
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    _buildOffersList(isDark, isBuy: true),
                    _buildOffersList(isDark, isBuy: false),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOffersList(bool isDark, {required bool isBuy}) {
    final offers = isBuy ? _buyOffers : _sellOffers;

    if (_isLoading) {
      return _buildLoadingShimmer(isDark);
    }

    if (offers.isEmpty) {
      return _buildEmptyState(isDark, isBuy);
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: offers.length,
      itemBuilder: (context, index) {
        final offer = offers[index];
        return _buildOfferCard(isDark, offer);
      },
    );
  }

  Widget _buildLoadingShimmer(bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 3,
      itemBuilder: (context, index) {
        return Shimmer.fromColors(
          baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
          highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
          child: Container(
            margin: const EdgeInsets.only(bottom: 16),
            height: 160,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(bool isDark, bool isBuy) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isBuy ? Icons.shopping_cart_outlined : Icons.sell_outlined,
            size: 64,
            color: isDark ? Colors.grey[600] : Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'No ${isBuy ? 'Buy' : 'Sell'} Offers Yet',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Your ${isBuy ? 'buy' : 'sell'} offers will appear here',
            style: TextStyle(
              color: isDark ? Colors.grey[600] : Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOfferCard(bool isDark, Map<String, dynamic> offer) {
    final isBuy = offer['type'] == 'buy';
    final paymentMethods = (offer['paymentMethods'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    
    // Format amount
    final amount = double.tryParse(offer['amount'].toString()) ?? 0;
    final formattedAmount = amount.toStringAsFixed(2);
    
    // Format price
    final price = double.tryParse(offer['price'].toString()) ?? 0;
    final formattedPrice = NumberFormat("#,##0.00").format(price);
    
    return Container(
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            // TODO: Navigate to offer details
          },
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '$formattedAmount AAVE',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: (isBuy ? SafeJetColors.success : SafeJetColors.warning)
                            .withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        isBuy ? 'BUY' : 'SELL',
                        style: TextStyle(
                          color: isBuy ? SafeJetColors.success : SafeJetColors.warning,
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
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$formattedPrice ${offer['currency']}',
                          style: const TextStyle(
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
                          'Status',
                          style: TextStyle(
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          (offer['status'] ?? '').toString().toUpperCase(),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: _getStatusColor(offer['status'] ?? ''),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                if (paymentMethods.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    children: paymentMethods
                        .map((method) => _buildPaymentTag(
                              isDark,
                              method['name'] ?? 'Unknown',
                            ))
                        .toList(),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentTag(bool isDark, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 8,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          color: isDark ? Colors.grey[400] : Colors.grey[600],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return SafeJetColors.success;
      case 'pending':
        return SafeJetColors.warning;
      case 'completed':
        return SafeJetColors.primary;
      default:
        return SafeJetColors.error;
    }
  }
} 