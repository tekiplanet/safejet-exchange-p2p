import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:shimmer/shimmer.dart';
import '../../config/theme/colors.dart';
import '../../services/wallet_service.dart';
import 'package:intl/intl.dart';

class ConvertScreen extends StatefulWidget {
  final Map<String, dynamic> fromAsset; // Initial asset to convert from
  final bool showInUSD;
  final double userCurrencyRate;
  final String userCurrency;

  const ConvertScreen({
    super.key,
    required this.fromAsset,
    required this.showInUSD,
    required this.userCurrencyRate,
    required this.userCurrency,
  });

  @override
  _ConvertScreenState createState() => _ConvertScreenState();
}

class _ConvertScreenState extends State<ConvertScreen> {
  final _walletService = GetIt.I<WalletService>();
  final _amountController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  // Available balances
  Map<String, double> _fundingBalances = {};
  List<Map<String, dynamic>> _availableTokens = [];
  Map<String, dynamic>? _selectedToToken;

  // Exchange rate and fee info
  double _exchangeRate = 0.0;
  double _conversionFee = 0.0;
  String _feeType = '';

  @override
  void initState() {
    super.initState();
    print('Received fromAsset data: ${widget.fromAsset}');
    _loadBalances();
    _loadAvailableTokens();
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _loadBalances() async {
    setState(() => _isLoading = true);
    try {
      // Load all tokens with their funding balances
      final balances = await _walletService.getAllWalletBalances();
      
      // Filter tokens with non-zero funding balance
      _fundingBalances = {};
      _availableTokens = [];
      
      for (var token in balances) {
        final fundingBalance = double.tryParse(token['funding']?.toString() ?? '0') ?? 0.0;
        if (fundingBalance > 0) {
          _fundingBalances[token['token']['id']] = fundingBalance;
          _availableTokens.add(token);
        }
      }

      setState(() {
        _isLoading = false;
        // Set first available token as default 'to' token
        if (_availableTokens.isNotEmpty && _availableTokens[0]['token']['id'] != widget.fromAsset['token']['id']) {
          _selectedToToken = _availableTokens[0];
        } else if (_availableTokens.length > 1) {
          _selectedToToken = _availableTokens[1];
        }
      });

      // Load initial exchange rate if we have both tokens
      if (_selectedToToken != null) {
        _updateExchangeRate();
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load balances';
        _isLoading = false;
      });
    }
  }

  Future<void> _updateExchangeRate() async {
    if (_selectedToToken == null) return;
    
    setState(() => _isLoading = true);
    try {
      // Get exchange rate
      final rate = await _walletService.getExchangeRate(
        fromTokenId: widget.fromAsset['token']['id'],
        toTokenId: _selectedToToken!['token']['id'],
      );
      
      if (rate <= 0) {
        throw Exception('Invalid exchange rate');
      }

      // Get conversion fee
      final feeResponse = await _walletService.getConversionFee(
        tokenId: widget.fromAsset['token']['id'],
        amount: double.tryParse(_amountController.text) ?? 0,
      );

      setState(() {
        _exchangeRate = rate;
        _conversionFee = double.tryParse(feeResponse['value'] ?? '0') ?? 0;
        _feeType = feeResponse['type'] ?? 'percentage';
        _isLoading = false;
        _errorMessage = null;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to update exchange rate';
        _isLoading = false;
        _exchangeRate = 0;
      });
      print('Error updating exchange rate: $e');
    }
  }

  void _setMaxAmount() {
    final fundingBalance = _fundingBalances[widget.fromAsset['token']['id']] ?? 0.0;
    _amountController.text = fundingBalance.toString();
  }

  String _formatBalance(double balance) {
    return NumberFormat.decimalPattern().format(balance);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final token = widget.fromAsset['token'];

    return Scaffold(
      backgroundColor: isDark ? SafeJetColors.primaryBackground : SafeJetColors.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back,
            color: isDark ? Colors.white : Colors.black,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Convert ${token['symbol']}',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [
                    SafeJetColors.darkGradientStart,
                    SafeJetColors.darkGradientEnd,
                  ]
                : [
                    SafeJetColors.lightGradientStart,
                    SafeJetColors.lightGradientEnd,
                  ],
          ),
        ),
        child: _isLoading 
            ? _buildShimmerLoading()
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_errorMessage != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: SafeJetColors.error.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline, color: SafeJetColors.error),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: TextStyle(color: SafeJetColors.error),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 24),
                    // From Asset Section
                    Text(
                      'From',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isDark 
                              ? [
                                  SafeJetColors.darkGradientStart,
                                  SafeJetColors.darkGradientEnd,
                                ]
                              : [
                                  SafeJetColors.lightGradientStart,
                                  SafeJetColors.lightGradientEnd,
                                ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark 
                              ? Colors.white.withOpacity(0.1)
                              : Colors.grey[300]!,
                        ),
                      ),
                      child: Row(
                        children: [
                          Image.network(
                            token['metadata']['icon'],
                            width: 32,
                            height: 32,
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                token['symbol'],
                                style: theme.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.white : Colors.black,
                                ),
                              ),
                              Text(
                                'Balance: ${widget.fromAsset['balance']}',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Amount Input Section
                    const SizedBox(height: 24),
                    Card(
                      elevation: 4,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isDark 
                                ? [
                                    SafeJetColors.darkGradientStart,
                                    SafeJetColors.darkGradientEnd,
                                  ]
                                : [
                                    SafeJetColors.lightGradientStart,
                                    SafeJetColors.lightGradientEnd,
                                  ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Amount',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                                  ),
                                ),
                                TextButton(
                                  onPressed: _setMaxAmount,
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                    backgroundColor: isDark 
                                        ? Colors.black.withOpacity(0.3)
                                        : Colors.white,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  child: Text(
                                    'MAX',
                                    style: TextStyle(
                                      color: SafeJetColors.warning,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isDark ? Colors.black.withOpacity(0.3) : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: _amountController,
                                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                                      style: theme.textTheme.titleLarge?.copyWith(
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? Colors.white : Colors.black,
                                      ),
                                      decoration: InputDecoration(
                                        hintText: '0.00',
                                        border: InputBorder.none,
                                        isDense: true,
                                        contentPadding: EdgeInsets.zero,
                                      ),
                                      onChanged: (value) {
                                        setState(() {});
                                      },
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: isDark 
                                          ? Colors.black.withOpacity(0.2)
                                          : Colors.grey[200],
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      token['symbol'],
                                      style: theme.textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? Colors.white : Colors.black,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // To Token Selection
                    const SizedBox(height: 24),
                    Card(
                      elevation: 4,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isDark 
                                ? [
                                    SafeJetColors.darkGradientStart,
                                    SafeJetColors.darkGradientEnd,
                                  ]
                                : [
                                    SafeJetColors.lightGradientStart,
                                    SafeJetColors.lightGradientEnd,
                                  ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'To',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: isDark ? Colors.white : Colors.black,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              decoration: BoxDecoration(
                                color: isDark ? Colors.black.withOpacity(0.3) : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: DropdownButtonFormField<Map<String, dynamic>>(
                                value: _selectedToToken,
                                isExpanded: true,
                                icon: Icon(
                                  Icons.keyboard_arrow_down,
                                  color: isDark ? Colors.white70 : Colors.black54,
                                ),
                                dropdownColor: isDark ? Colors.black87 : Colors.white,
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: Colors.transparent,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(
                                      color: isDark 
                                          ? Colors.white.withOpacity(0.1)
                                          : Colors.grey[300]!,
                                    ),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: _availableTokens.map((token) {
                                  return DropdownMenuItem<Map<String, dynamic>>(
                                    value: token,
                                    child: Row(
                                      children: [
                                        if (token['token']['icon'] != null) ...[
                                          Image.network(
                                            token['token']['icon'],
                                            width: 24,
                                            height: 24,
                                            errorBuilder: (context, error, stackTrace) => 
                                              Icon(Icons.currency_bitcoin, size: 24),
                                          ),
                                          const SizedBox(width: 8),
                                        ],
                                        Text(
                                          token['token']['symbol'],
                                          style: TextStyle(
                                            color: isDark ? Colors.white : Colors.black,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                                onChanged: (newValue) {
                                  if (newValue != null) {
                                    setState(() {
                                      _selectedToToken = newValue;
                                    });
                                    _updateExchangeRate();
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Conversion Details
                    if (_selectedToToken != null && _amountController.text.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.symmetric(vertical: 24),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.black.withOpacity(0.3) : Colors.grey[100],
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isDark 
                                ? Colors.white.withOpacity(0.1)
                                : Colors.grey[300]!,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Conversion Details',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            _buildDetailRow(
                              'Exchange Rate',
                              '1 ${token['symbol']} = ${_formatBalance(_exchangeRate)} ${_selectedToToken!['token']['symbol']}',
                              theme,
                              isDark,
                            ),
                            const SizedBox(height: 8),
                            _buildDetailRow(
                              'Conversion Fee',
                              '${_conversionFee} ${_feeType == 'percentage' ? '%' : (_feeType == 'usd' ? 'USD' : token['symbol'])}',
                              theme,
                              isDark,
                            ),
                            const SizedBox(height: 8),
                            _buildDetailRow(
                              'You Will Receive',
                              '${_formatBalance(_calculateAmountToReceive())} ${_selectedToToken!['token']['symbol']}',
                              theme,
                              isDark,
                              isHighlighted: true,
                            ),
                          ],
                        ),
                      ),

                    // Convert Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _handleConvert,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: SafeJetColors.warning,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          _isLoading ? 'Processing...' : 'Convert',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
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

  Widget _buildShimmerLoading() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Shimmer.fromColors(
            baseColor: Colors.grey[300]!,
            highlightColor: Colors.grey[100]!,
            child: Container(
              height: 100,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Add more shimmer placeholders as needed
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, ThemeData theme, bool isDark, {bool isHighlighted = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: isDark ? Colors.grey[400] : Colors.grey[600],
          ),
        ),
        Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: isHighlighted ? FontWeight.bold : null,
            color: isHighlighted 
                ? SafeJetColors.warning
                : (isDark ? Colors.white : Colors.black),
          ),
        ),
      ],
    );
  }

  double _calculateAmountToReceive() {
    if (_amountController.text.isEmpty) return 0;
    final amount = double.tryParse(_amountController.text) ?? 0;
    final baseAmount = amount * _exchangeRate;
    
    // Apply conversion fee
    if (_feeType == 'percentage') {
      return baseAmount * (1 - _conversionFee / 100);
    } else if (_feeType == 'usd') {
      // Convert USD fee to token amount and subtract
      // This needs proper implementation based on token prices
      return baseAmount;
    } else {
      // Fee is in token amount
      return baseAmount - _conversionFee;
    }
  }

  Future<void> _handleConvert() async {
    if (_amountController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter an amount'),
          backgroundColor: SafeJetColors.error,
        ),
      );
      return;
    }

    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid amount'),
          backgroundColor: SafeJetColors.error,
        ),
      );
      return;
    }

    final fundingBalance = _fundingBalances[widget.fromAsset['token']['id']] ?? 0.0;
    if (amount > fundingBalance) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Insufficient ${widget.fromAsset['token']['symbol']} balance'),
          backgroundColor: SafeJetColors.error,
        ),
      );
      return;
    }

    // Show confirmation dialog
    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            bool isModalLoading = false;

            return Dialog(
              backgroundColor: Colors.transparent,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: Theme.of(context).brightness == Brightness.dark 
                        ? [SafeJetColors.darkGradientStart, SafeJetColors.darkGradientEnd]
                        : [SafeJetColors.lightGradientStart, SafeJetColors.lightGradientEnd],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Theme.of(context).brightness == Brightness.dark 
                        ? Colors.white.withOpacity(0.1)
                        : Colors.grey[300]!,
                  ),
                ),
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Confirm Conversion',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Amount and conversion details
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context).brightness == Brightness.dark 
                            ? Colors.black.withOpacity(0.3)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Theme.of(context).brightness == Brightness.dark 
                              ? Colors.white.withOpacity(0.1)
                              : Colors.grey[300]!,
                        ),
                      ),
                      child: Column(
                        children: [
                          Text(
                            '${_formatBalance(amount)} ${widget.fromAsset['token']['symbol']}',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: SafeJetColors.warning,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildDetailRow(
                            'You Will Receive',
                            '${_formatBalance(_calculateAmountToReceive())} ${_selectedToToken!['token']['symbol']}',
                            Theme.of(context),
                            Theme.of(context).brightness == Brightness.dark,
                            isHighlighted: true,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: TextButton(
                            onPressed: isModalLoading ? null : () => Navigator.of(dialogContext).pop(),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: Text('Cancel'),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: isModalLoading
                                ? null
                                : () async {
                                    setModalState(() => isModalLoading = true);
                                    
                                    try {
                                      await _walletService.convertToken(
                                        fromTokenId: widget.fromAsset['token']['id'],
                                        toTokenId: _selectedToToken!['token']['id'],
                                        amount: amount,
                                      );

                                      Navigator.of(dialogContext).pop();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Conversion successful'),
                                          backgroundColor: SafeJetColors.success,
                                        ),
                                      );
                                      Navigator.pop(context);
                                    } catch (e) {
                                      Navigator.of(dialogContext).pop();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(e.toString()),
                                          backgroundColor: SafeJetColors.error,
                                        ),
                                      );
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: SafeJetColors.warning,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: isModalLoading
                                ? SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Theme.of(context).brightness == Brightness.dark 
                                            ? Colors.white 
                                            : Colors.black,
                                      ),
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
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _loadAvailableTokens() async {
    try {
      final response = await _walletService.getAvailableCoins();
      setState(() {
        _availableTokens = response
            .where((coin) => coin.id != widget.fromAsset['token']['id']) // Filter out the current token
            .map((coin) => {
                  'token': {
                    'id': coin.id,
                    'symbol': coin.symbol,
                    'icon': coin.iconUrl,
                    'name': coin.name,
                  }
                })
            .toList();
        
        // Set first available token as default if none selected
        if (_selectedToToken == null && _availableTokens.isNotEmpty) {
          _selectedToToken = _availableTokens.first;
          _updateExchangeRate(); // Update exchange rate for initial selection
        }
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load available tokens';
      });
    }
  }
} 