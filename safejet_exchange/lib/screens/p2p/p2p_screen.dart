import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/custom_app_bar.dart';
import 'p2p_offer_details_screen.dart';
import 'p2p_order_history_screen.dart';
import 'p2p_create_offer_screen.dart';
import 'package:flutter_speed_dial/flutter_speed_dial.dart';
import 'p2p_my_offers_screen.dart';
import 'package:get_it/get_it.dart';
import '../../services/p2p_service.dart';

class P2PScreen extends StatefulWidget {
  const P2PScreen({super.key});

  @override
  State<P2PScreen> createState() => _P2PScreenState();
}

class _P2PScreenState extends State<P2PScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _p2pService = GetIt.I<P2PService>();
  
  // State variables
  String? _selectedCurrency;
  String? _selectedTokenId;
  String? _selectedPaymentMethodId;
  bool _isLoadingOffers = false;
  bool _isLoadingFilters = false;
  
  List<Map<String, dynamic>> _offers = [];
  List<Map<String, dynamic>> _currencies = [];
  List<Map<String, dynamic>> _tokens = [];
  List<Map<String, dynamic>> _paymentMethods = [];
  
  // Pagination
  int _currentPage = 1;
  int _totalPages = 1;
  bool _hasMoreData = true;
  bool _isLoadingMore = false;
  
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_handleTabChange);
    _scrollController.addListener(_handleScroll);
    _loadInitialData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() => _isLoadingFilters = true);
    try {
      // Load filters in parallel
      final futures = await Future.wait([
        _p2pService.getTraderSettings(),
        _p2pService.getActiveCurrencies(),
        _p2pService.getAvailableAssets(_tabController.index == 0),
        _p2pService.getActivePaymentMethodTypes(),
      ]);

      if (!mounted) return;

      final settings = futures[0] as Map<String, dynamic>;
      final currencies = futures[1] as List<Map<String, dynamic>>;
      final tokens = futures[2] as List<Map<String, dynamic>>;
      final paymentMethods = futures[3] as List<Map<String, dynamic>>;

      setState(() {
        _selectedCurrency = settings['currency'] ?? 
            (currencies.isNotEmpty ? currencies[0]['symbol'] : null);
        _currencies = currencies;
        _tokens = tokens;
        _paymentMethods = paymentMethods;
        if (tokens.isNotEmpty) {
          _selectedTokenId = tokens[0]['id'];
        }
      });

      if (_selectedCurrency != null) {
        await _loadOffers();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: SafeJetColors.error,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoadingFilters = false);
      }
    }
  }

  Future<void> _loadOffers({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _currentPage = 1;
        _hasMoreData = true;
      });
    }

    if (!_hasMoreData) return;

    setState(() => _isLoadingOffers = true);
    try {
      final result = await _p2pService.getPublicOffers(
        isBuy: _tabController.index == 0,
        currency: _selectedCurrency,
        tokenId: _selectedTokenId,
        paymentMethodId: _selectedPaymentMethodId,
        page: _currentPage,
      );

      if (!mounted) return;

      final newOffers = (result['offers'] as List).cast<Map<String, dynamic>>();
      final pagination = result['pagination'] as Map<String, dynamic>;

      setState(() {
        if (refresh) {
          _offers = newOffers;
        } else {
          _offers.addAll(newOffers);
        }
        _totalPages = pagination['pages'] as int;
        _hasMoreData = _currentPage < _totalPages;
        _currentPage++;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: SafeJetColors.error,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoadingOffers = false);
      }
    }
  }

  void _handleTabChange() {
    if (_tabController.indexIsChanging) {
      _loadOffers(refresh: true);
    }
  }

  void _handleScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        _hasMoreData) {
      _loadOffers();
    }
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
                    itemCount: _currencies.length,
                    itemBuilder: (context, index) {
                      final currency = _currencies[index]['code'] as String;
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
                        _selectedTokenId,
                        isDark,
                        onTap: () => _showFilterOptions(
                          context,
                          'Select Crypto',
                          _tokens.map((e) => e['id'] as String).toList(),
                          _selectedTokenId,
                          (value) => setState(() => _selectedTokenId = value),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Payment Method Dropdown
                    Expanded(
                      flex: 3,
                      child: _buildFilterButton(
                        _selectedPaymentMethodId,
                        isDark,
                        onTap: () => _showFilterOptions(
                          context,
                          'Payment Method',
                          _paymentMethods.map((e) => e['id'] as String).toList(),
                          _selectedPaymentMethodId,
                          (value) => setState(() => _selectedPaymentMethodId = value),
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
      floatingActionButton: SpeedDial(
        icon: Icons.add,
        activeIcon: Icons.close,
        backgroundColor: SafeJetColors.secondaryHighlight,
        foregroundColor: Colors.black,
        activeBackgroundColor: SafeJetColors.error,
        activeForegroundColor: Colors.white,
        spacing: 3,
        childPadding: const EdgeInsets.all(5),
        spaceBetweenChildren: 4,
        children: [
          SpeedDialChild(
            child: const Icon(Icons.create),
            backgroundColor: SafeJetColors.secondaryHighlight,
            foregroundColor: Colors.black,
            label: 'Create Offer',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const P2PCreateOfferScreen(),
                ),
              );
            },
          ),
          SpeedDialChild(
            child: const Icon(Icons.list_alt),
            backgroundColor: SafeJetColors.secondaryHighlight,
            foregroundColor: Colors.black,
            label: 'My Offers',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const P2PMyOffersScreen(), // We'll create this screen
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildOffersList(bool isDark, {required bool isBuy}) {
    if (_isLoadingOffers && _offers.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: () => _loadOffers(refresh: true),
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: _offers.length + (_hasMoreData ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _offers.length) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            );
          }

          final offer = _offers[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _buildOfferCard(isDark, isBuy, offer),
          );
        },
      ),
    );
  }

  Widget _buildOfferCard(bool isDark, bool isBuy, Map<String, dynamic> offer) {
    // Add logging
    print('Building offer card:');
    print('Offer type: ${offer['type']}');
    print('Payment methods: ${offer['paymentMethods']}');
    
    final token = _tokens.firstWhere(
      (t) => t['id'] == offer['tokenId'],
      orElse: () => {'symbol': 'Unknown'},
    );

    final paymentMethodsData = offer['paymentMethods'] as List;
    final paymentMethods = paymentMethodsData.map((pm) {
      // The name is already provided by the backend
      return (pm as Map<String, dynamic>)['name'] as String;
    }).toList();

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
                  offerId: offer['id'],
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
                          backgroundColor: isDark
                              ? Colors.white.withOpacity(0.1)
                              : Colors.grey[200],
                          child: Text(
                            (offer['user']['name'] as String?)?.isNotEmpty == true 
                                ? (offer['user']['name'] as String).substring(0, 1).toUpperCase()
                                : 'U',
                            style: TextStyle(
                              color: isDark ? Colors.white : Colors.black,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          offer['user']['name'] ?? 'Unknown User',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.05)
                            : Colors.grey[100],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        token['symbol'] ?? 'Unknown',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Flexible(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Price',
                            style: TextStyle(
                              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _formatPrice(offer['price'], offer['currency']),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Flexible(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'Available',
                            style: TextStyle(
                              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${_formatAmount(offer['amount'])} ${token['symbol']}',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (paymentMethods.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: paymentMethods.map((method) => 
                      _buildPaymentTag(method, isDark)
                    ).toList(),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterButton(String? text, bool isDark, {required VoidCallback onTap}) {
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
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  text ?? 'Select',
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
    String? selectedValue,
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

  String _formatPrice(dynamic price, String currency) {
    if (price == null) return '$currency 0.00';
    
    // Convert to double and handle scientific notation
    final amount = double.tryParse(price.toString()) ?? 0.0;
    // Format with thousand separators and 2 decimal places
    final formatted = amount.toStringAsFixed(2)
        .replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},');
    
    return '$currency $formatted';
  }

  String _formatAmount(dynamic amount) {
    if (amount == null) return '0.00';
    final value = double.tryParse(amount.toString()) ?? 0.0;
    return value.toStringAsFixed(2)
        .replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},');
  }
} 