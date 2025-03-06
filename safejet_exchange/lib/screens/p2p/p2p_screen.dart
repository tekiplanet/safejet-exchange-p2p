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
import 'package:shimmer/shimmer.dart';

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
  bool _isInitialLoading = true;  // Track initial loading state
  
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

  // Add these state variables to _P2PScreenState
  double? _minPrice;
  double? _maxPrice;
  double? _minAmount;
  double? _maxAmount;

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
    setState(() {
      _isLoadingFilters = true;
      _isInitialLoading = true;  // Set initial loading
    });
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
        setState(() {
          _isLoadingFilters = false;
          _isInitialLoading = false;  // Clear initial loading
        });
      }
    }
  }

  Future<void> _loadOffers({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _currentPage = 1;
        _hasMoreData = true;
        _offers = [];
        _isLoadingOffers = true;
      });
    }

    if (!_hasMoreData) return;

    if (!refresh) {
      setState(() => _isLoadingOffers = true);
    }

    try {
      final result = await _p2pService.getPublicOffers(
        isBuy: _tabController.index == 0,
        currency: _selectedCurrency,
        tokenId: _selectedTokenId,
        paymentMethodId: _selectedPaymentMethodId,
        minPrice: _minPrice,
        maxPrice: _maxPrice,
        minAmount: _minAmount,
        maxAmount: _maxAmount,
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

  void _handleTabChange() async {
    if (_tabController.indexIsChanging) {
      // Clear current tokens and show loading
      setState(() {
        _tokens = [];
        _selectedTokenId = null;
      });
      
      try {
        // Load new tokens for the selected tab
        final newTokens = await _p2pService.getAvailableAssets(_tabController.index == 0);
        
        if (!mounted) return;
        
        setState(() {
          _tokens = newTokens;
          if (newTokens.isNotEmpty) {
            _selectedTokenId = newTokens[0]['id'];
          }
        });
        
        // Load offers with new filters
        _loadOffers(refresh: true);
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: SafeJetColors.error,
          ),
        );
      }
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
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
            ),
            child: TabBar(
            controller: _tabController,
              indicator: BoxDecoration(
                color: SafeJetColors.secondaryHighlight,
                borderRadius: BorderRadius.circular(8),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              indicatorPadding: EdgeInsets.zero,
              dividerColor: Colors.transparent,
              labelColor: Colors.black,
              unselectedLabelColor: isDark ? Colors.white : Colors.black,
              labelStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
              unselectedLabelStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.normal,
              ),
            tabs: const [
                Tab(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Text('BUY'),
                  ),
                ),
                Tab(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Text('SELL'),
                  ),
                ),
              ],
            ),
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
                                _loadOffers(refresh: true);
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
                        _tokens.isEmpty ? 'Select' : _tokens.firstWhere(
                          (t) => t['id'] == _selectedTokenId,
                          orElse: () => {'symbol': 'Select'},
                        )['symbol'],
                        isDark,
                        onTap: () => _showFilterOptions(
                          context,
                          'Select Crypto',
                          _tokens,
                          _selectedTokenId,
                          (value) {
                            setState(() => _selectedTokenId = value);
                            _loadOffers(refresh: true);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Payment Method Dropdown
                    Expanded(
                      flex: 3,
                      child: _buildFilterButton(
                        _selectedPaymentMethodId != null
                            ? _paymentMethods.firstWhere(
                                (pm) => pm['id'] == _selectedPaymentMethodId,
                                orElse: () => {'name': 'All Payment'},
                              )['name']
                            : 'All Payment',
                        isDark,
                        onTap: () => _showFilterOptions(
                          context,
                          'Payment Method',
                          _paymentMethods,
                          _selectedPaymentMethodId,
                          (value) {
                            setState(() => _selectedPaymentMethodId = value);
                            _loadOffers(refresh: true);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Filter Button
                    Container(
                      height: 40,
                      width: 40,
                      decoration: BoxDecoration(
                        color: (_minPrice != null || _maxPrice != null || _minAmount != null || _maxAmount != null)
                            ? SafeJetColors.secondaryHighlight.withOpacity(0.2)
                            : isDark
                                ? Colors.white.withOpacity(0.05)
                                : Colors.black.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: IconButton(
                        icon: Icon(
                          Icons.tune_rounded,
                          color: (_minPrice != null || _maxPrice != null || _minAmount != null || _maxAmount != null)
                              ? SafeJetColors.secondaryHighlight
                              : isDark
                                  ? Colors.white
                                  : SafeJetColors.lightText,
                        ),
                        onPressed: () => _showFilterSheet(context, isDark),
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
    return RefreshIndicator(
      onRefresh: () => _loadOffers(refresh: true),
      child: _isInitialLoading
          ? ListView.builder(
      padding: const EdgeInsets.all(16),
              itemCount: 5,
              itemBuilder: (context, index) => _buildOfferCardShimmer(isDark),
            )
          : _offers.isEmpty && !_isLoadingOffers
              ? _buildEmptyState(isDark)
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _offers.length + (_hasMoreData ? 1 : 0),
      itemBuilder: (context, index) {
                    if (index == _offers.length) {
                      return _buildOfferCardShimmer(isDark);
                    }
        return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _buildOfferCard(isDark, isBuy, _offers[index]),
                    );
                  },
                ),
    );
  }

  Widget _buildOfferCard(bool isDark, bool isBuy, Map<String, dynamic> offer) {
    final token = _tokens.firstWhere(
      (t) => t['id'] == offer['tokenId'],
      orElse: () => {'symbol': 'Unknown'},
    );

    final paymentMethodsData = offer['paymentMethods'] as List;
    final paymentMethods = paymentMethodsData.map((pm) {
      return (pm as Map<String, dynamic>)['name'] as String;
    }).toList();

    return Material(
      color: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => P2POfferDetailsScreen(
                offerId: offer['id'],
                  isBuy: isBuy,
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
              // Trader Info Row
                Row(
                  children: [
                  // Avatar and Name
                  Expanded(
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
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
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                              Text(
                                offer['user']['name'] ?? 'Unknown User',
                              style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : Colors.black,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color: Colors.green,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                            Text(
                                    'Online',  // or "Last seen 2h ago"
                              style: TextStyle(
                                fontSize: 12,
                                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                        ),
                      ],
                    ),
                  ),
                  // Trader Stats
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.star_rounded,
                            size: 16,
                            color: SafeJetColors.secondaryHighlight,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '98%',  // Completion rate
                        style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: isDark ? Colors.white : Colors.black,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '300+ orders',  // Total orders
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
              // Price and Amount Row
                Row(
                  children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Price',
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatPrice(offer['price'], offer['currency']),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Available',
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              _formatAmount(offer['amount']),
                              style: const TextStyle(
                                fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? Colors.white.withOpacity(0.1)
                                    : Colors.grey[200],
                                borderRadius: BorderRadius.circular(4),
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
                  ],
                ),
                    ),
                  ],
                ),
              if (paymentMethods.isNotEmpty) ...[
                const SizedBox(height: 12),
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
    List<dynamic> options,
    String? selectedValue,
    Function(String?) onSelect,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final TextEditingController searchController = TextEditingController();
    
    final isPaymentMethods = title.contains('Payment');
    List<dynamic> mappedOptions = options;
    
    if (isPaymentMethods) {
      mappedOptions = [
        {
          'id': null,
          'name': 'All Payment',
          'icon': 'payment',
        },
        ...mappedOptions,
      ];
    }

    List<dynamic> filteredOptions = List.from(mappedOptions);

    print('=== Filter Options Debug ===');
    print('Title: $title');
    print('Is Payment Methods: $isPaymentMethods');
    print('Selected Value: $selectedValue');
    print('Original Options: $options');
    print('Mapped Options: $mappedOptions');
    print('========================');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          print('Building bottom sheet...');
          print('Filtered Options: $filteredOptions');
          
          return Container(
            height: MediaQuery.of(context).size.height * 0.7,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0C0C0C) : const Color(0xFFF5F5F5),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            ),
        child: Column(
          children: [
                // Handle bar
                Center(
                  child: Container(
                    margin: const EdgeInsets.only(top: 8),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey[600] : Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                // Header
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
              title,
                    style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                ),
                // Search bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TextField(
                      controller: searchController,
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                      ),
                      decoration: InputDecoration(
                        hintText: isPaymentMethods ? 'Search payment methods' : 'Search crypto',
                        hintStyle: TextStyle(
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                        prefixIcon: Icon(
                          Icons.search,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      onChanged: (value) {
                        setState(() {
                          filteredOptions = options.where((option) {
                            if (isPaymentMethods) {
                              final name = option['name'] as String;
                              return name.toLowerCase().contains(value.toLowerCase());
                            } else {
                              final symbol = option['symbol'] as String;
                              final name = option['name'] as String;
                              return symbol.toLowerCase().contains(value.toLowerCase()) ||
                                     name.toLowerCase().contains(value.toLowerCase());
                            }
                          }).toList();
                        });
                      },
                    ),
              ),
            ),
            const SizedBox(height: 16),
                // List of options
                Expanded(
                  child: ListView.builder(
                    itemCount: filteredOptions.length,
                    itemBuilder: (context, index) {
                      final option = filteredOptions[index];
                      print('Building item at index $index:');
                      print('Option data: $option');
                      
                      if (isPaymentMethods) {
                        try {
                          final name = option['name'] as String;
                          final icon = option['icon'] as String? ?? 'payment';
                          final value = option['id'];  // Don't cast to String, can be null for "All Payment"
                          final isSelected = value == selectedValue;

                          return Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () {
                                onSelect(value);  // Can be null for "All Payment"
                                Navigator.pop(context);
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  border: Border(
                                    bottom: BorderSide(
                                      color: isDark 
                                          ? Colors.white.withOpacity(0.1)
                                          : Colors.grey[200]!,
                                    ),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    // Payment method icon
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: isDark
                                            ? Colors.white.withOpacity(0.05)
                                            : Colors.grey[100],
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Icon(
                                        _getPaymentMethodIcon(icon),
                                        color: isDark ? Colors.white : Colors.black,
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    // Payment method name
                                    Expanded(
                                      child: Text(
                                        name,
                                        style: TextStyle(
                                          fontSize: 16,
                                          color: isDark ? Colors.white : Colors.black,
                                        ),
                                      ),
                                    ),
                                    if (isSelected)
                                      Icon(
                                        Icons.check_circle,
                      color: SafeJetColors.secondaryHighlight,
                                        size: 24,
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        } catch (e) {
                          print('Error building payment method item: $e');
                          print('Raw option data: $option');
                          return const SizedBox.shrink();
                        }
                      } else {
                        try {
                          final value = option['id'] as String;
                          final symbol = option['symbol'] as String;
                          final name = option['name'] as String;
                          print('Token - Symbol: $symbol, Name: $name, Value: $value');
                          
                          final isSelected = value == selectedValue;

                          return Material(
                            color: Colors.transparent,
                            child: InkWell(
              onTap: () {
                                onSelect(value);
                Navigator.pop(context);
              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  border: Border(
                                    bottom: BorderSide(
                                      color: isDark 
                                          ? Colors.white.withOpacity(0.1)
                                          : Colors.grey[200]!,
                                    ),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    // Token icon/letter
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: isDark
                                            ? Colors.white.withOpacity(0.05)
                                            : Colors.grey[100],
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Center(
                                        child: option['metadata']?['icon'] != null
                                            ? Image.network(
                                                option['metadata']['icon'],
                                                width: 24,
                                                height: 24,
                                                errorBuilder: (context, error, stackTrace) => Text(
                                                  symbol[0].toUpperCase(),
                                                  style: TextStyle(
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.bold,
                                                    color: isDark ? Colors.white : Colors.black,
                                                  ),
                                                ),
                                              )
                                            : Text(
                                                symbol[0].toUpperCase(),
                                                style: TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.bold,
                                                  color: isDark ? Colors.white : Colors.black,
                                                ),
                                              ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    // Token details
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            symbol,
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: isDark ? Colors.white : Colors.black,
                                            ),
                                          ),
                                          if (name.isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              name,
                                              style: TextStyle(
                                                fontSize: 14,
                                                color: isDark ? Colors.grey[400] : Colors.grey[600],
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    // Selection indicator
                                    if (isSelected)
                                      Icon(
                                        Icons.check_circle,
                                        color: SafeJetColors.secondaryHighlight,
                                        size: 24,
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        } catch (e) {
                          print('Error building token item: $e');
                          print('Raw option data: $option');
                          return const SizedBox.shrink(); // Return empty widget on error
                        }
                      }
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  IconData _getPaymentMethodIcon(String icon) {
    switch (icon.toLowerCase()) {  // Make case-insensitive
      case 'bank':
        return Icons.account_balance;
      case 'qr_code':
        return Icons.qr_code;
      case 'payment':
        return Icons.payment;
      case 'mobile':
        return Icons.phone_android;
      case 'money':
        return Icons.attach_money;
      case 'card':
        return Icons.credit_card;
      default:
        return Icons.payment;
    }
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

  // Add this widget to show when there are no offers
  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.receipt_long,
            size: 64,
            color: isDark ? Colors.grey[700] : Colors.grey[300],
          ),
          const SizedBox(height: 16),
          Text(
            'No Offers Available',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your filters',
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[500] : Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOfferCardShimmer(bool isDark) {
    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey[900]! : Colors.grey[300]!,
      highlightColor: isDark ? Colors.grey[800]! : Colors.grey[100]!,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User info row
            Row(
              children: [
                // Avatar placeholder
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                const SizedBox(width: 12),
                // Name and stats placeholder
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 120,
                        height: 14,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(7),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        width: 80,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Price and amount placeholders
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 100,
                  height: 20,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                Container(
                  width: 80,
                  height: 20,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Payment methods placeholder
            Row(
              children: List.generate(3, (index) => 
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Container(
                    width: 60,
                    height: 24,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Add this method to show the filter bottom sheet
  void _showFilterSheet(BuildContext context, bool isDark) {
    final TextEditingController minPriceController = TextEditingController();
    final TextEditingController maxPriceController = TextEditingController();
    final TextEditingController minAmountController = TextEditingController();
    final TextEditingController maxAmountController = TextEditingController();

    // Set initial values if they exist
    if (_minPrice != null) minPriceController.text = _minPrice.toString();
    if (_maxPrice != null) maxPriceController.text = _maxPrice.toString();
    if (_minAmount != null) minAmountController.text = _minAmount.toString();
    if (_maxAmount != null) maxAmountController.text = _maxAmount.toString();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0C0C0C) : const Color(0xFFF5F5F5),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: StatefulBuilder(
          builder: (context, setState) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 16, 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Filter',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    IconButton(
                      icon: Icon(
                        Icons.close,
                        color: isDark ? Colors.white70 : Colors.black54,
                        size: 24,
                      ),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Filter content
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Price Range
                    Text(
                      'Price Range (${_selectedCurrency ?? ""})',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white70 : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: minPriceController,
                            keyboardType: TextInputType.number,
                            style: TextStyle(
                              color: isDark ? Colors.white : Colors.black,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Min',
                              hintStyle: TextStyle(
                                color: isDark ? Colors.white38 : Colors.black38,
                              ),
                              filled: true,
                              fillColor: isDark 
                                  ? Colors.white.withOpacity(0.05) 
                                  : Colors.grey[100],
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: maxPriceController,
                            keyboardType: TextInputType.number,
                            style: TextStyle(
                              color: isDark ? Colors.white : Colors.black,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Max',
                              hintStyle: TextStyle(
                                color: isDark ? Colors.white38 : Colors.black38,
                              ),
                              filled: true,
                              fillColor: isDark 
                                  ? Colors.white.withOpacity(0.05) 
                                  : Colors.grey[100],
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Amount Range
                    Text(
                      'Amount Range (${_tokens.firstWhere((t) => t['id'] == _selectedTokenId, orElse: () => {'symbol': ''})['symbol']})',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white70 : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: minAmountController,
                            keyboardType: TextInputType.number,
                            style: TextStyle(
                              color: isDark ? Colors.white : Colors.black,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Min',
                              hintStyle: TextStyle(
                                color: isDark ? Colors.white38 : Colors.black38,
                              ),
                              filled: true,
                              fillColor: isDark 
                                  ? Colors.white.withOpacity(0.05) 
                                  : Colors.grey[100],
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: maxAmountController,
                            keyboardType: TextInputType.number,
                            style: TextStyle(
                              color: isDark ? Colors.white : Colors.black,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Max',
                              hintStyle: TextStyle(
                                color: isDark ? Colors.white38 : Colors.black38,
                              ),
                              filled: true,
                              fillColor: isDark 
                                  ? Colors.white.withOpacity(0.05) 
                                  : Colors.grey[100],
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Apply button
              Padding(
                padding: const EdgeInsets.all(24),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: SafeJetColors.secondaryHighlight,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    onPressed: () {
                      setState(() {
                        _minPrice = double.tryParse(minPriceController.text);
                        _maxPrice = double.tryParse(maxPriceController.text);
                        _minAmount = double.tryParse(minAmountController.text);
                        _maxAmount = double.tryParse(maxAmountController.text);
                      });
                      Navigator.pop(context);
                      _loadOffers(refresh: true);
                    },
                    child: const Text(
                      'Apply Filters',
                      style: TextStyle(
                        color: Colors.black,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Add this method to clear filters
  void _clearFilters() {
    setState(() {
      _minPrice = null;
      _maxPrice = null;
      _minAmount = null;
      _maxAmount = null;
    });
    _loadOffers(refresh: true);
  }
} 