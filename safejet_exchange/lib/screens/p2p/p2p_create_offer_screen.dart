import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';

class P2PCreateOfferScreen extends StatefulWidget {
  const P2PCreateOfferScreen({super.key});

  @override
  State<P2PCreateOfferScreen> createState() => _P2PCreateOfferScreenState();
}

class _P2PCreateOfferScreenState extends State<P2PCreateOfferScreen> {
  bool _isBuyOffer = true;
  String _selectedCrypto = 'USDT';
  String _selectedCurrency = 'NGN';
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _termsController = TextEditingController();
  
  final List<Map<String, dynamic>> _selectedPaymentMethods = [];

  final List<Map<String, dynamic>> _availablePaymentMethods = [
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

  final List<Map<String, String>> _cryptoOptions = [
    {'symbol': 'USDT', 'name': 'Tether'},
    {'symbol': 'BTC', 'name': 'Bitcoin'},
    {'symbol': 'ETH', 'name': 'Ethereum'},
    {'symbol': 'BUSD', 'name': 'Binance USD'},
    {'symbol': 'USDC', 'name': 'USD Coin'},
  ];

  @override
  void dispose() {
    _amountController.dispose();
    _priceController.dispose();
    _termsController.dispose();
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
              onTap: () => setState(() => _isBuyOffer = true),
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
              onTap: () => setState(() => _isBuyOffer = false),
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

  Widget _buildCryptoSelector(bool isDark) {
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
        InkWell(
          onTap: () => _showCryptoSelector(isDark),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withOpacity(0.05)
                  : Colors.black.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.05)
                            : Colors.black.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _selectedCrypto,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _cryptoOptions.firstWhere(
                        (c) => c['symbol'] == _selectedCrypto)['name']!,
                      style: TextStyle(
                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
                Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showCryptoSelector(bool isDark) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select Asset',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: _cryptoOptions.length,
                itemBuilder: (context, index) {
                  final crypto = _cryptoOptions[index];
                  final isSelected = crypto['symbol'] == _selectedCrypto;
                  
                  return ListTile(
                    onTap: () {
                      setState(() => _selectedCrypto = crypto['symbol']!);
                      Navigator.pop(context);
                    },
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.05)
                            : Colors.black.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        crypto['symbol']!,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    title: Text(crypto['name']!),
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
            prefixText: '₦',
            suffixText: '/ $_selectedCrypto',
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
        const SizedBox(height: 8),
        Row(
          children: [
            Icon(
              Icons.info_outline,
              size: 16,
              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
            ),
            const SizedBox(width: 8),
            Text(
              'Market price: ₦750.00',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPaymentMethods(bool isDark) {
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
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _availablePaymentMethods.map((method) {
            final isSelected = _selectedPaymentMethods.contains(method);
            return GestureDetector(
              onTap: () {
                setState(() {
                  if (isSelected) {
                    _selectedPaymentMethods.remove(method);
                  } else {
                    _selectedPaymentMethods.add(method);
                  }
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (_isBuyOffer ? SafeJetColors.success : SafeJetColors.error)
                      : (isDark
                          ? Colors.white.withOpacity(0.05)
                          : Colors.black.withOpacity(0.05)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      method['icon'] as IconData,
                      size: 16,
                      color: isSelected
                          ? Colors.white
                          : (isDark ? Colors.white : Colors.black),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      method['name'] as String,
                      style: TextStyle(
                        color: isSelected
                            ? Colors.white
                            : (isDark ? Colors.white : Colors.black),
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

  void _handleCreateOffer() {
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
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: isDark ? SafeJetColors.primaryBackground : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Preview Offer',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                _buildPreviewItem('Type', _isBuyOffer ? 'Buy' : 'Sell', isDark),
                _buildPreviewItem(
                  'Asset',
                  '${_cryptoOptions.firstWhere((c) => c['symbol'] == _selectedCrypto)['name']} ($_selectedCrypto)',
                  isDark,
                ),
                _buildPreviewItem(
                  'Amount',
                  '${_amountController.text} $_selectedCrypto',
                  isDark,
                ),
                _buildPreviewItem(
                  'Price',
                  '₦${_priceController.text}/$_selectedCrypto',
                  isDark,
                ),
                _buildPreviewItem(
                  'Payment Methods',
                  _selectedPaymentMethods.map((m) => m['name'] as String).join(', '),
                  isDark,
                ),
                const Divider(height: 32),
                Text(
                  'Terms & Instructions',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _termsController.text.isEmpty ? 'None' : _termsController.text,
                  style: const TextStyle(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          'Edit',
                          style: TextStyle(
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextButton(
                        onPressed: () {
                          Navigator.pop(context);
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Offer created successfully'),
                              backgroundColor: SafeJetColors.success,
                            ),
                          );
                        },
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          foregroundColor: _isBuyOffer ? SafeJetColors.success : SafeJetColors.error,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'Confirm',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPreviewItem(String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDark ? Colors.grey[400] : Colors.grey[600],
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 16,
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