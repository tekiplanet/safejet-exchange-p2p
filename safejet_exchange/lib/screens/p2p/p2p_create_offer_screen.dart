import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:get_it/get_it.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import '../../services/p2p_service.dart';

class P2PCreateOfferScreen extends StatefulWidget {
  const P2PCreateOfferScreen({super.key});

  @override
  State<P2PCreateOfferScreen> createState() => _P2PCreateOfferScreenState();
}

class _P2PCreateOfferScreenState extends State<P2PCreateOfferScreen> {
  final _p2pService = GetIt.I<P2PService>();
  bool _isLoading = false;
  List<Map<String, dynamic>> _availableAssets = [];
  bool _isBuyOffer = true;
  String _selectedCrypto = 'USDT';
  String _selectedCurrency = 'NGN';
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _termsController = TextEditingController();
  
  final List<String> _selectedPaymentMethods = [];
  String _userCurrency = 'NGN';
  double? _marketPrice;
  bool _isPriceLoading = false;

  List<Map<String, dynamic>> _availablePaymentMethods = [];
  bool _isLoadingPaymentMethods = false;

  final List<Map<String, dynamic>> _availablePaymentMethodsList = [
    {
      'name': 'Bank Transfer',
      'icon': Icons.account_balance,
      'details': {'account': '', 'bank': '', 'name': ''},
    },
    {
      'name': 'PayPal',
      'icon': Icons.payment,
      'details': {'email': ''},
    },
    {
      'name': 'Cash App',
      'icon': Icons.attach_money,
      'details': {'cashtag': ''},
    },
    {
      'name': 'Wise',
      'icon': Icons.currency_exchange,
      'details': {'email': ''},
    },
  ];

  final TextEditingController _searchController = TextEditingController();
  List<Map<String, dynamic>> _filteredAssets = [];

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    setState(() => _isLoading = true);
    try {
      print('Starting to load initial data...');
      
      // Load trader settings
      print('Fetching trader settings...');
      final settings = await _p2pService.getTraderSettings();
      print('Trader settings received: $settings');
      _userCurrency = settings['currency'];

      // Load available assets
      await _loadAssets();

      // Load market price
      print('Loading market price for $_selectedCrypto in $_userCurrency');
      await _updateMarketPrice();

      // Load payment methods
      await _loadPaymentMethods();
    } catch (e) {
      print('Error in _loadInitialData: $e');
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

  Future<void> _loadAssets() async {
    setState(() => _isLoading = true);
    try {
      final assets = await _p2pService.getAvailableAssets(_isBuyOffer);
      setState(() {
        _availableAssets = assets;
        if (assets.isNotEmpty) {
          final newSelectedCrypto = assets[0]['symbol'];
          if (_selectedCrypto != newSelectedCrypto) {
            _selectedCrypto = assets[0]['symbol'];
            _updateMarketPrice();  // Update market price for the new asset
          }
        }
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

  Future<void> _updateMarketPrice() async {
    if (_selectedCrypto.isEmpty) return;

    print('Updating market price for $_selectedCrypto in $_userCurrency');
    setState(() => _isPriceLoading = true);
    try {
      final price = await _p2pService.getMarketPrice(_selectedCrypto, _userCurrency);
      print('Received market price: $price');
      setState(() {
        _marketPrice = price;
        // Format price with commas and proper decimals
        _priceController.text = price.toStringAsFixed(2).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},'
        );
      });
    } catch (e) {
      print('Error loading market price: $e');
    } finally {
      setState(() => _isPriceLoading = false);
    }
  }

  Future<void> _loadPaymentMethods() async {
    setState(() => _isLoadingPaymentMethods = true);
    try {
      final methods = await _p2pService.getPaymentMethods(_isBuyOffer);
      setState(() => _availablePaymentMethods = methods);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: SafeJetColors.error,
        ),
      );
    } finally {
      setState(() => _isLoadingPaymentMethods = false);
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _priceController.dispose();
    _termsController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Create Offer',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildOfferTypeSelector(isDark),
                  const SizedBox(height: 24),
                  _buildCryptoSelector(isDark),
                  const SizedBox(height: 24),
                  _buildAmountInput(isDark),
                  const SizedBox(height: 24),
                  _buildPriceInput(isDark),
                  const SizedBox(height: 24),
                  _buildPaymentMethods(isDark),
                  const SizedBox(height: 24),
                  _buildTermsInput(isDark),
                ],
              ),
            ),
          ),
          _buildBottomActions(isDark),
        ],
      ),
    );
  }

  Widget _buildOfferTypeSelector(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => _toggleOfferType(),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: _isBuyOffer
                      ? SafeJetColors.success
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Text(
                  'Buy',
                  style: TextStyle(
                    color: _isBuyOffer
                        ? Colors.white
                        : (isDark ? Colors.white : Colors.black),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => _toggleOfferType(),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: !_isBuyOffer
                      ? SafeJetColors.error
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Text(
                  'Sell',
                  style: TextStyle(
                    color: !_isBuyOffer
                        ? Colors.white
                        : (isDark ? Colors.white : Colors.black),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _toggleOfferType() {
    setState(() {
      _isBuyOffer = !_isBuyOffer;
      _selectedPaymentMethods.clear();  // Clear selected methods
    });
    _loadAssets();  // Keep these outside setState
    _loadPaymentMethods();  // Keep these outside setState
  }

  Widget _buildCryptoSelector(bool isDark) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_availableAssets.isEmpty) {
      return Center(
        child: Text(
          'No assets available',
          style: TextStyle(
            color: isDark ? Colors.grey[400] : Colors.grey[600],
          ),
        ),
      );
    }

    final selectedAsset = _availableAssets.firstWhere(
      (asset) => asset['symbol'] == _selectedCrypto,
      orElse: () => _availableAssets.first,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Asset',
          style: TextStyle(
            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => _showCryptoSelector(isDark),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark 
                  ? Colors.white.withOpacity(0.05)
                  : Colors.black.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Text(
                  selectedAsset['symbol'],
                  style: TextStyle(
                    color: isDark ? Colors.white : Colors.black,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const Spacer(),
                Icon(
                  Icons.keyboard_arrow_down,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showCryptoSelector(bool isDark) {
    _filteredAssets = _availableAssets;
    _searchController.clear();
    
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? SafeJetColors.darkGradientStart : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Select Asset',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(
                    Icons.close,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search assets...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: isDark
                    ? Colors.white.withOpacity(0.05)
                    : Colors.black.withOpacity(0.05),
                contentPadding: const EdgeInsets.all(16),
              ),
              onChanged: (query) {
                setState(() {
                  _filteredAssets = _availableAssets.where((asset) {
                    final symbol = asset['symbol'].toString().toLowerCase();
                    final name = asset['name'].toString().toLowerCase();
                    return symbol.contains(query.toLowerCase()) || 
                           name.contains(query.toLowerCase());
                  }).toList();
                });
              },
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: _filteredAssets.length,
                itemBuilder: (context, index) {
                  final asset = _filteredAssets[index];
                  final isSelected = asset['symbol'] == _selectedCrypto;
                  
                  return ListTile(
                    onTap: () {
                      setState(() => _selectedCrypto = asset['symbol']);
                      _updateMarketPrice();
                      Navigator.pop(context);
                    },
                    leading: Image.network(
                      asset['metadata']['icon'],
                      width: 32,
                      height: 32,
                      errorBuilder: (_, __, ___) => const Icon(Icons.error),
                    ),
                    title: Text(
                      asset['name'],
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    subtitle: !_isBuyOffer && asset['fundingBalance'] != null
                        ? Text(
                            'Balance: ${asset['fundingBalance'].toStringAsFixed(6)} ${asset['symbol']}',
                            style: TextStyle(
                              color: isDark ? Colors.grey[400] : Colors.grey[600],
                              fontSize: 12,
                            ),
                          )
                        : null,
                    trailing: isSelected
                        ? Icon(
                            Icons.check_circle,
                            color: _isBuyOffer 
                                ? SafeJetColors.success 
                                : SafeJetColors.error,
                          )
                        : null,
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAmountInput(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Amount',
          style: TextStyle(
            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
          ],
          decoration: InputDecoration(
            hintText: '0.00',
            suffixText: _selectedCrypto,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            filled: true,
            fillColor: isDark
                ? Colors.white.withOpacity(0.05)
                : Colors.black.withOpacity(0.05),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }

  Widget _buildPriceInput(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Price',
          style: TextStyle(
            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _priceController,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
          ],
          decoration: InputDecoration(
            hintText: '0.00',
            suffixText: _userCurrency,
            helperText: _marketPrice != null 
              ? 'Market Price: ${_marketPrice!.toStringAsFixed(2).replaceAllMapped(
                RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                (Match m) => '${m[1]},'
              )}'
              : _isPriceLoading ? 'Loading market price...' : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            filled: true,
            fillColor: isDark
                ? Colors.white.withOpacity(0.05)
                : Colors.black.withOpacity(0.05),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }

  IconData _getIconForName(String iconName) {
    switch (iconName) {
      case 'bank':
        return Icons.account_balance;
      case 'mobile':
        return Icons.phone_android;
      case 'qr_code':
        return Icons.qr_code;
      case 'payment':
        return Icons.payment;
      default:
        return Icons.payment; // Default icon
    }
  }

  Widget _buildPaymentMethods(bool isDark) {
    if (_isLoadingPaymentMethods) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Payment Methods',
          style: TextStyle(
            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 8),
        if (_availablePaymentMethods.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                _isBuyOffer 
                  ? 'No payment methods configured. Please add payment methods in your profile.'
                  : 'No payment methods available.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _availablePaymentMethods.map((method) {
              // Get the correct icon and name based on whether it's a buy or sell offer
              final String icon = _isBuyOffer 
                  ? method['icon'] 
                  : method['paymentMethodType']['icon'];
              final String name = _isBuyOffer 
                  ? method['name']
                  : '${method['name']} (${method['paymentMethodType']['name']})';
              final String id = method['id'];

              final isSelected = _selectedPaymentMethods.contains(id);
              return GestureDetector(
                onTap: () {
                  setState(() {
                    if (isSelected) {
                      _selectedPaymentMethods.remove(id);
                    } else {
                      _selectedPaymentMethods.add(id);
                    }
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? (_isBuyOffer ? SafeJetColors.success : SafeJetColors.error).withOpacity(0.1)
                        : isDark
                            ? Colors.white.withOpacity(0.05)
                            : Colors.black.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected
                          ? (_isBuyOffer ? SafeJetColors.success : SafeJetColors.error)
                          : Colors.transparent,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _getIconForName(icon),
                        size: 20,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        name,
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildTermsInput(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Terms & Instructions',
          style: TextStyle(
            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _termsController,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: 'Enter your payment instructions and terms...',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            filled: true,
            fillColor: isDark
                ? Colors.white.withOpacity(0.05)
                : Colors.black.withOpacity(0.05),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomActions(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryBackground
            : SafeJetColors.lightBackground,
        border: Border(
          top: BorderSide(
            color: isDark
                ? SafeJetColors.primaryAccent.withOpacity(0.2)
                : SafeJetColors.lightCardBorder,
          ),
        ),
      ),
      child: Center(
        child: SizedBox(
          width: 200,
          child: ElevatedButton(
            onPressed: _handleCreateOffer,
            style: ElevatedButton.styleFrom(
              backgroundColor: _isBuyOffer ? SafeJetColors.success : SafeJetColors.error,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              elevation: 0,
            ),
            child: Text(_isBuyOffer ? 'Create Buy Offer' : 'Create Sell Offer'),
          ),
        ),
      ),
    );
  }

  void _handleCreateOffer() async {
    if (_selectedPaymentMethods.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one payment method'),
          backgroundColor: SafeJetColors.error,
        ),
      );
      return;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    bool isSubmitting = false;
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => Dialog.fullscreen(
        child: Scaffold(
          backgroundColor: isDark ? SafeJetColors.primaryBackground : Colors.white,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            leading: IconButton(
              icon: Icon(
                Icons.close,
                color: isDark ? Colors.white : Colors.black,
              ),
              onPressed: () => Navigator.pop(context),
            ),
            title: Text(
              'Preview Offer',
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          body: StatefulBuilder(
            builder: (context, setState) => Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Please confirm your offer details:',
                          style: TextStyle(
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 32),
                        _buildDetailCard(
                          title: 'Type',
                          value: _isBuyOffer ? 'Buy' : 'Sell',
                          icon: _isBuyOffer ? Icons.add_circle : Icons.remove_circle,
                          isDark: isDark,
                          highlight: true,
                        ),
                        const SizedBox(height: 16),
                        _buildDetailCard(
                          title: 'Asset',
                          value: '${_availableAssets.firstWhere((a) => a['symbol'] == _selectedCrypto)['name']} ($_selectedCrypto)',
                          icon: Icons.currency_bitcoin,
                          isDark: isDark,
                        ),
                        const SizedBox(height: 16),
                        _buildDetailCard(
                          title: 'Amount',
                          value: '${_amountController.text} $_selectedCrypto',
                          icon: Icons.account_balance_wallet,
                          isDark: isDark,
                        ),
                        const SizedBox(height: 16),
                        _buildDetailCard(
                          title: 'Price',
                          value: '₦${_priceController.text}/$_selectedCrypto',
                          icon: Icons.payments,
                          isDark: isDark,
                        ),
                        const SizedBox(height: 16),
                        _buildDetailCard(
                          title: 'Payment Methods',
                          value: _selectedPaymentMethods
                              .map((id) => _availablePaymentMethods
                                  .firstWhere(
                                    (method) => method['id'].toString() == id,
                                    orElse: () => {'name': 'Unknown Method'}
                                  )['name']
                              )
                              .join(', '),
                          icon: Icons.payment,
                          isDark: isDark,
                        ),
                        if (_termsController.text.isNotEmpty) ...[
                          const SizedBox(height: 32),
                          Text(
                            'Terms & Instructions',
                            style: TextStyle(
                              color: isDark ? Colors.grey[400] : Colors.grey[600],
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _termsController.text,
                            style: const TextStyle(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isSubmitting ? null : () async {
                        setState(() => isSubmitting = true);
                        try {
                          // Get the selected asset details
                          final selectedAsset = _availableAssets.firstWhere(
                            (asset) => asset['symbol'] == _selectedCrypto,
                          );
                          
                          final tokenId = selectedAsset['id'] ?? selectedAsset['token']?['id'];
                          if (tokenId == null) {
                            throw Exception('Could not determine token ID');
                          }

                          // Create the offer
                          await _p2pService.createOffer({
                            'tokenId': tokenId,
                            'amount': double.parse(_amountController.text),
                            'price': double.parse(_priceController.text.replaceAll(',', '')),
                            'priceUSD': _marketPrice ?? 0,
                            'currency': _userCurrency,
                            'isBuyOffer': _isBuyOffer,
                            'terms': _termsController.text,
                            'paymentMethods': _selectedPaymentMethods.map((id) => ({
                              'typeId': id,
                              'methodId': _isBuyOffer ? null : id,
                            })).toList(),
                          });

                          Navigator.pop(context, true);
                        } catch (e) {
                          setState(() => isSubmitting = false);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(e.toString().replaceAll('Exception: ', '')),
                              backgroundColor: SafeJetColors.error,
                            ),
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: SafeJetColors.secondaryHighlight,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: isSubmitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                            ),
                          )
                        : const Text(
                            'Confirm',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    if (confirmed == true) {
      if (mounted) {
        Navigator.pop(context);  // Close the create offer screen
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Offer created successfully'),
            backgroundColor: SafeJetColors.success,
          ),
        );
      }
    }
  }

  Widget _buildDetailCard({
    required String title,
    required String value,
    required IconData icon,
    required bool isDark,
    bool highlight = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: highlight 
            ? (isDark ? SafeJetColors.secondaryHighlight.withOpacity(0.1) : SafeJetColors.secondaryHighlight.withOpacity(0.05))
            : (isDark ? Colors.black.withOpacity(0.3) : Colors.white),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: highlight
                  ? SafeJetColors.secondaryHighlight.withOpacity(0.1)
                  : (isDark ? Colors.black.withOpacity(0.3) : Colors.grey[100]),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: highlight
                  ? SafeJetColors.secondaryHighlight
                  : (isDark ? Colors.grey[400] : Colors.grey[600]),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    color: isDark ? Colors.white : Colors.black,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _managePaymentMethod(Map<String, dynamic> method) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Setup ${method['name']}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: method['details'].entries.map<Widget>((entry) {
            return TextField(
              decoration: InputDecoration(
                labelText: entry.key.toUpperCase(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (value) {
                method['details'][entry.key] = value;
              },
            );
          }).toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              // TODO: Validate and save payment method details
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
} 