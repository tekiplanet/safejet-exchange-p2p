import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/theme/colors.dart';
import 'package:animate_do/animate_do.dart';
import '../../widgets/custom_app_bar.dart';
import 'package:provider/provider.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/coin_selection_modal.dart';
import '../../widgets/network_selection_modal.dart';
import '../../models/coin.dart';
import '../../widgets/two_factor_dialog.dart';
import '../../services/biometric_service.dart';
import './qr_scanner_screen.dart';
import '../../models/recent_address.dart';
import '../../widgets/address_book_modal.dart';
import '../../services/address_service.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:get_it/get_it.dart';
import '../../services/service_locator.dart';
import '../../services/wallet_service.dart';
import 'package:intl/intl.dart';

class WithdrawScreen extends StatefulWidget {
  final Map<String, dynamic> asset;
  final bool showInUSD;
  final double userCurrencyRate;
  final String userCurrency;

  const WithdrawScreen({
    super.key,
    required this.asset,
    required this.showInUSD,
    required this.userCurrencyRate,
    required this.userCurrency,
  });

  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  final _walletService = GetIt.I<WalletService>();
  final _addressController = TextEditingController();
  final _amountController = TextEditingController();
  
  late Coin? _selectedCoin;
  late Network? _selectedNetwork;
  
  bool _isLoading = false;
  bool _isFiat = false;
  bool _maxAmount = false;
  
  String? _addressError;
  String? _amountError;
  String? _warningMessage;
  
  Map<String, dynamic>? _feeDetails;
  double? _receiveAmount;

  String _selectedFiatCurrency = 'USD';  // Remove hardcoded NGN
  bool get _showInUSD => widget.showInUSD;
  String get _userCurrency => widget.userCurrency;
  double get _userCurrencyRate => widget.userCurrencyRate;

  // Add number formatters
  final _numberFormat = NumberFormat("#,##0.00", "en_US");
  final _cryptoFormat = NumberFormat("#,##0.00######", "en_US");

  // Add local asset state
  late Map<String, dynamic> _currentAsset;

  // Add the currency symbol helper
  String _getCurrencySymbol(String currency) {
    switch (currency) {
      case 'USD':
        return '\$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'NGN':
        return '₦';
      default:
        return currency;
    }
  }

  double _convertAmount(String amount, bool toFiat) {
    if (amount.isEmpty) return 0;
    final parsedAmount = double.tryParse(amount) ?? 0;
    
    // Get token price from asset data
    final tokenPrice = double.tryParse(widget.asset['token']?['currentPrice']?.toString() ?? '0') ?? 0.0;
    
    if (toFiat) {
      // Converting from token to fiat (e.g., 1 BTC -> USD or EUR)
      final usdAmount = parsedAmount * tokenPrice;
      return _selectedFiatCurrency == 'USD' ? usdAmount : usdAmount * _userCurrencyRate;
    } else {
      // Converting from fiat to token (e.g., USD or EUR -> BTC)
      if (_selectedFiatCurrency == 'USD') {
        return tokenPrice > 0 ? parsedAmount / tokenPrice : 0;
      } else {
        // First convert user currency to USD, then to token
        final usdAmount = parsedAmount / _userCurrencyRate;
        return tokenPrice > 0 ? usdAmount / tokenPrice : 0;
      }
    }
  }

  String _getFormattedAmount() {
    if (_amountController.text.isEmpty) return '';
    final amount = double.tryParse(_amountController.text) ?? 0;
    
    if (_isFiat) {
      // When input is in fiat, show crypto equivalent
      final cryptoAmount = _convertAmount(_amountController.text, false);
      return '≈ ${_cryptoFormat.format(cryptoAmount)} ${_selectedCoin?.symbol}';
    } else {
      // When input is in crypto, show fiat equivalent
      final fiatAmount = _convertAmount(_amountController.text, true);
      return '≈ ${_numberFormat.format(fiatAmount)} ${_selectedFiatCurrency}';
    }
  }

  @override
  void initState() {
    super.initState();
    _currentAsset = widget.asset;
    _initializeCoin();  // This will set _selectedCoin and _selectedNetwork
    _amountController.addListener(_onAmountChanged);
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handleCoinSelection();
    });
  }

  @override
  void dispose() {
    _addressController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  void _initializeCoin() {
    final token = _currentAsset['token'] as Map<String, dynamic>;
    _selectedCoin = Coin(
      id: token['id'],
      symbol: token['baseSymbol'],
      name: token['name'],
      networks: [
        Network(
          name: token['network'] ?? 'mainnet',
          blockchain: token['blockchain'] ?? 'unknown',
          version: token['networkVersion'] ?? '1.0',
          arrivalTime: token['arrivalTime'] ?? '10-30 minutes',
          network: token['network'] ?? 'mainnet',
        )
      ],
      iconUrl: token['icon'],
    );
    _selectedNetwork = _selectedCoin!.networks[0];

    // Set initial warning message
    _updateWarningMessage();
  }

  void _updateWarningMessage() {
    if (_selectedCoin == null || _selectedNetwork == null) {
      setState(() => _warningMessage = null);
      return;
    }
    
    try {
      final token = _currentAsset['token'] as Map<String, dynamic>;
      final networkConfigs = token['networkConfigs'] as Map<String, dynamic>? ?? {};
      final networkConfig = networkConfigs[_selectedNetwork!.version]?[_selectedNetwork!.network] ?? {};
      
      setState(() {
        _warningMessage = networkConfig['withdrawMessage'] as String? ?? 
            'Ensure the withdrawal address is correct';  // Default message
      });
    } catch (e) {
      setState(() => _warningMessage = 'Ensure the withdrawal address is correct');
    }
  }

  Future<void> _onAmountChanged() async {
    if (_amountController.text.isEmpty || _selectedCoin == null || _selectedNetwork == null) {
      setState(() {
        _feeDetails = null;
        _receiveAmount = null;
      });
      return;
    }

    final inputAmount = double.tryParse(_amountController.text);
    if (inputAmount == null) return;

    try {
      // Convert fiat amount to token amount if needed
      final tokenAmount = _isFiat 
          ? _convertAmount(_amountController.text, false)  // Convert from fiat to token
          : inputAmount;  // Already in token amount

      // Calculate fee using token amount
      final feeDetails = await _walletService.calculateWithdrawalFee(
        tokenId: _selectedCoin!.id,
        amount: tokenAmount,
        networkVersion: _selectedNetwork!.version,
        network: _selectedNetwork!.network,
      );

      setState(() {
        _feeDetails = feeDetails;
        _receiveAmount = double.parse(feeDetails['receiveAmount']);
      });
    } catch (e) {
      print('Error calculating fee: $e');
    }
  }

  // Add validation methods
  bool _validateAddress(String address) {
    if (address.isEmpty) {
      setState(() => _addressError = 'Address is required');
      return false;
    }

    switch (_selectedNetwork?.name) {
      case 'Bitcoin Network (BTC)':
        if (!address.startsWith('bc1') && !address.startsWith('1') && !address.startsWith('3')) {
          setState(() => _addressError = 'Invalid Bitcoin address');
          return false;
        }
        if (address.length < 26 || address.length > 35) {
          setState(() => _addressError = 'Invalid Bitcoin address length');
          return false;
        }
        break;
      case 'ERC-20':
      case 'BEP-20':
        if (!address.startsWith('0x')) {
          setState(() => _addressError = 'Invalid address format');
          return false;
        }
        if (address.length != 42) {
          setState(() => _addressError = 'Invalid address length');
          return false;
        }
        break;
      case 'TRC-20':
        if (!address.startsWith('T')) {
          setState(() => _addressError = 'Invalid TRON address');
          return false;
        }
        if (address.length != 34) {
          setState(() => _addressError = 'Invalid address length');
          return false;
        }
        break;
      case 'Solana Network':
        if (address.length != 44) {
          setState(() => _addressError = 'Invalid Solana address length');
          return false;
        }
        break;
    }

    setState(() => _addressError = null);
    return true;
  }

  bool _validateAmount(String amount) {
    // Add debug prints
    print('Asset data: ${widget.asset}');
    print('Asset type: ${widget.asset['type']}');
    print('Asset balance: ${widget.asset['balance']}');
    
    if (amount.isEmpty) {
      setState(() => _amountError = 'Amount is required');
      return false;
    }

    final parsedAmount = double.tryParse(amount);
    if (parsedAmount == null) {
      setState(() => _amountError = 'Invalid amount');
      return false;
    }

    if (parsedAmount <= 0) {
      setState(() => _amountError = 'Amount must be greater than 0');
      return false;
    }

    // Use balance directly since this is already a funding wallet
    final fundingBalance = double.tryParse(_currentAsset['balance']?.toString() ?? '0') ?? 0.0;
    final coinAmount = _isFiat ? _convertAmount(amount, false) : parsedAmount;
    
    print('Attempting to withdraw: $coinAmount');
    print('Available funding balance: $fundingBalance');
    
    if (coinAmount > fundingBalance) {
      setState(() => _amountError = 'Insufficient funding balance');
      return false;
    }

    setState(() => _amountError = null);
    return true;
  }

  // Add withdrawal confirmation dialog
  Future<bool> _showConfirmationDialog() async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? SafeJetColors.primaryBackground
            : SafeJetColors.lightBackground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('Confirm Withdrawal'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Please confirm your withdrawal details:'),
            const SizedBox(height: 16),
            _buildConfirmationRow('Amount:', '${_amountController.text} ${_selectedCoin?.symbol}'),
            _buildConfirmationRow('Network Fee:', '0.0001 ${_selectedCoin?.symbol}'),
            _buildConfirmationRow('You will receive:', '${(double.parse(_amountController.text) - 0.0001).toStringAsFixed(4)} ${_selectedCoin?.symbol}'),
            _buildConfirmationRow('Network:', _selectedNetwork?.name ?? 'Not selected'),
            _buildConfirmationRow('Address:', _addressController.text),
            const SizedBox(height: 16),
            Text(
              'This action cannot be undone.',
              style: TextStyle(color: SafeJetColors.error),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: SafeJetColors.secondaryHighlight,
              foregroundColor: Colors.black,
            ),
            child: const Text('Confirm'),
          ),
        ],
      ),
    ) ?? false;
  }

  Widget _buildConfirmationRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  Future<void> _saveAddress(String address) async {
    if (_selectedCoin == null || _selectedNetwork == null) return;
    
    await GetIt.I<AddressService>().addRecentAddress(
      RecentAddress(
        address: address,
        coin: _selectedCoin!.symbol,
        network: _selectedNetwork!.name,
        lastUsed: DateTime.now(),
      ),
    );
  }

  Future<void> _handleCoinSelection() async {
    final result = await Navigator.push<Coin>(
      context,
      MaterialPageRoute(
        builder: (context) => const CoinSelectionModal(),
        fullscreenDialog: true,
      ),
    );
    
    if (result != null) {
      final data = await _walletService.getBalances(
        type: 'funding',
        currency: widget.showInUSD ? 'USD' : widget.userCurrency,
      );

      if (data != null && data['balances'] != null) {
        final newAsset = data['balances'].firstWhere(
          (b) => b['baseSymbol'] == result.symbol,
          orElse: () => null,
        );

        if (newAsset != null) {
          setState(() {
            _currentAsset = newAsset;  // Update current asset
            _selectedCoin = result;
            _selectedNetwork = result.networks[0];
            _amountController.clear();  // Clear amount when changing coins
            _amountError = null;
            _maxAmount = false;
            _feeDetails = null;
          });
          
          // Call _updateWarningMessage after state is updated
          _updateWarningMessage();
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Material(
      child: Scaffold(
        extendBody: true,
        extendBodyBehindAppBar: true,
        backgroundColor: Colors.transparent,
        appBar: CustomAppBar(
          onNotificationTap: () {
            // TODO: Show notifications
          },
          onThemeToggle: () {
            final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
            themeProvider.toggleTheme();
          },
        ),
        body: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                isDark ? SafeJetColors.primaryBackground : SafeJetColors.lightBackground,
                isDark ? SafeJetColors.primaryBackground.withOpacity(0.8) : SafeJetColors.lightBackground.withOpacity(0.8),
              ],
            ),
          ),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Coin Selection
                  FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Select Coin',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildCoinSelection(theme, isDark),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Address Input
                  FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    delay: const Duration(milliseconds: 300),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Withdrawal Address',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
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
                              Expanded(
                                child: TextField(
                                  controller: _addressController,
                                  onChanged: (value) => _validateAddress(value),
                                  style: theme.textTheme.bodyMedium,
                                  decoration: InputDecoration(
                                    hintText: 'Enter wallet address',
                                    border: InputBorder.none,
                                    isDense: false,
                                    contentPadding: const EdgeInsets.symmetric(vertical: 8),
                                    hintStyle: TextStyle(
                                      color: isDark ? Colors.grey[600] : Colors.grey[400],
                                    ),
                                    suffixIcon: IconButton(
                                      icon: const Icon(Icons.qr_code_scanner),
                                      onPressed: () async {
                                        final scannedAddress = await Navigator.push<String>(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) => const QRScannerScreen(),
                                          ),
                                        );
                                        
                                        if (scannedAddress != null) {
                                          setState(() {
                                            _addressController.text = scannedAddress;
                                            _validateAddress(scannedAddress);
                                          });
                                        }
                                      },
                                    ),
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.book_outlined),
                                onPressed: () async {
                                  final address = await showModalBottomSheet<RecentAddress>(
                                    context: context,
                                    isScrollControlled: true,
                                    backgroundColor: Colors.transparent,
                                    builder: (context) => AddressBookModal(
                                      selectedCoin: _selectedCoin?.symbol ?? '',
                                      selectedNetwork: _selectedNetwork?.name ?? '',
                                      addressService: GetIt.I<AddressService>(),
                                    ),
                                  );

                                  if (address != null) {
                                    setState(() {
                                      _addressController.text = address.address;
                                      _validateAddress(address.address);
                                    });
                                  }
                                },
                              ),
                              IconButton(
                                onPressed: () async {
                                  final data = await Clipboard.getData('text/plain');
                                  if (data?.text != null) {
                                    _addressController.text = data!.text!;
                                  }
                                },
                                icon: const Icon(Icons.paste_rounded),
                                color: SafeJetColors.secondaryHighlight,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Amount Input
                  if (_selectedCoin != null)
                    FadeInDown(
                      duration: const Duration(milliseconds: 600),
                      delay: const Duration(milliseconds: 300),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Amount',
                                style: theme.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Row(
                                children: [
                                  ChoiceChip(
                                    label: Text(
                                      _selectedCoin?.symbol ?? '',
                                      style: TextStyle(
                                        color: !_isFiat ? Colors.black : (isDark ? Colors.grey[400] : Colors.grey[600]),
                                        fontWeight: !_isFiat ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                    selected: !_isFiat,
                                    selectedColor: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                                    backgroundColor: Colors.transparent,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                      side: BorderSide(
                                        color: !_isFiat 
                                            ? SafeJetColors.secondaryHighlight.withOpacity(0.3)
                                            : Colors.transparent,
                                      ),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    onSelected: (selected) {
                                      if (selected) {
                                        setState(() {
                                          _isFiat = false;
                                          _selectedFiatCurrency = _showInUSD ? 'USD' : _userCurrency;
                                          if (_amountController.text.isNotEmpty) {
                                            _amountController.text = _convertAmount(_amountController.text, false).toStringAsFixed(8);
                                          }
                                        });
                                      }
                                    },
                                  ),
                                  const SizedBox(width: 8),
                                  ChoiceChip(
                                    label: Text(
                                      'USD',
                                      style: TextStyle(
                                        color: _isFiat && _selectedFiatCurrency == 'USD' 
                                            ? Colors.black 
                                            : (isDark ? Colors.grey[400] : Colors.grey[600]),
                                        fontWeight: _isFiat && _selectedFiatCurrency == 'USD' ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                    selected: _isFiat && _selectedFiatCurrency == 'USD',
                                    selectedColor: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                                    backgroundColor: Colors.transparent,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                      side: BorderSide(
                                        color: _isFiat && _selectedFiatCurrency == 'USD'
                                            ? SafeJetColors.secondaryHighlight.withOpacity(0.3)
                                            : Colors.transparent,
                                      ),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    onSelected: (selected) {
                                      if (selected) {
                                        setState(() {
                                          _isFiat = true;
                                          _selectedFiatCurrency = 'USD';
                                          _amountController.clear(); // Clear amount
                                          _feeDetails = null; // Reset fee details
                                        });
                                      }
                                    },
                                  ),
                                  const SizedBox(width: 8),
                                  ChoiceChip(
                                    label: Text(
                                      _userCurrency,  // Use actual user currency
                                      style: TextStyle(
                                        color: _isFiat && _selectedFiatCurrency == _userCurrency
                                            ? Colors.black 
                                            : (isDark ? Colors.grey[400] : Colors.grey[600]),
                                        fontWeight: _isFiat && _selectedFiatCurrency == _userCurrency ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                    selected: _isFiat && _selectedFiatCurrency == _userCurrency,
                                    selectedColor: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                                    backgroundColor: Colors.transparent,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                      side: BorderSide(
                                        color: _isFiat && _selectedFiatCurrency == _userCurrency
                                            ? SafeJetColors.secondaryHighlight.withOpacity(0.3)
                                            : Colors.transparent,
                                      ),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    onSelected: (selected) {
                                      if (selected) {
                                        setState(() {
                                          _isFiat = true;
                                          _selectedFiatCurrency = _userCurrency;
                                          _amountController.clear(); // Clear amount
                                          _feeDetails = null; // Reset fee details
                                        });
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Container(
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
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextField(
                                        controller: _amountController,
                                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                        style: theme.textTheme.bodyMedium?.copyWith(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 20,
                                        ),
                                        decoration: InputDecoration(
                                          hintText: '0.00',
                                          border: InputBorder.none,
                                          isDense: true,
                                          contentPadding: EdgeInsets.zero,
                                          hintStyle: TextStyle(
                                            color: isDark ? Colors.grey[600] : Colors.grey[400],
                                          ),
                                          prefixText: _isFiat 
                                              ? '${_getCurrencySymbol(_selectedFiatCurrency)} ' 
                                              : '',
                                        ),
                                        onChanged: (value) {
                                          setState(() {
                                            _validateAmount(value);
                                          });
                                        },
                                      ),
                                    ),
                                    TextButton(
                                      onPressed: () {
                                        setState(() {
                                          _maxAmount = true;
                                          final balance = double.tryParse(_currentAsset['balance']?.toString() ?? '0') ?? 0.0;
                                          _amountController.text = _isFiat 
                                              ? _convertAmount(balance.toString(), true).toStringAsFixed(2)
                                              : balance.toString();
                                        });
                                      },
                                      child: const Text('MAX'),
                                    ),
                                  ],
                                ),
                                if (_amountController.text.isNotEmpty && _amountError == null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: Text(
                                      _getFormattedAmount(),
                                      style: TextStyle(
                                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                      ),
                                    ),
                                  ),
                                if (_amountError != null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: Text(
                                      _amountError!,
                                      style: TextStyle(
                                        color: SafeJetColors.error,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Network Selection
                  if (_selectedCoin != null)
                    FadeInDown(
                      duration: const Duration(milliseconds: 600),
                      delay: const Duration(milliseconds: 200),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Network',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          GestureDetector(
                            onTap: () async {
                              await showModalBottomSheet<void>(
                                context: context,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (context) => NetworkSelectionModal(
                                  networks: _selectedCoin?.networks ?? [],
                                  selectedNetwork: _selectedNetwork ?? Network(
                                    name: 'mainnet',
                                    blockchain: 'unknown',
                                    version: '1.0',
                                    arrivalTime: '10-30 minutes',
                                    network: 'mainnet',
                                  ),
                                  onNetworkSelected: (network) async {
                                    setState(() {
                                      _selectedNetwork = network;
                                      _updateWarningMessage();
                                    });
                                    
                                    // Calculate initial fee
                                    if (_selectedCoin != null && _amountController.text.isNotEmpty) {
                                      try {
                                        final amount = double.tryParse(_amountController.text) ?? 0;
                                        final feeDetails = await _walletService.calculateWithdrawalFee(
                                          tokenId: _selectedCoin!.id,
                                          amount: amount,
                                          networkVersion: network.version,
                                          network: network.network,
                                        );
                                        
                                        setState(() {
                                          _feeDetails = feeDetails;
                                        });
                                      } catch (e) {
                                        print('Error calculating fee: $e');
                                      }
                                    }
                                    
                                    Navigator.pop(context);
                                  },
                                ),
                              );
                            },
                            child: Container(
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
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${_selectedNetwork?.blockchain.toUpperCase()} (${_selectedNetwork?.version})' +
                                          (_selectedNetwork?.network == 'testnet' ? ' - TESTNET' : ''),
                                          style: theme.textTheme.titleSmall?.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Average arrival time: ${_selectedNetwork?.arrivalTime}',
                                          style: TextStyle(
                                            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: SafeJetColors.success.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      'Active',
                                      style: TextStyle(
                                        color: SafeJetColors.success,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Fee Info
                  if (_selectedCoin != null)
                    FadeInDown(
                      duration: const Duration(milliseconds: 600),
                      delay: const Duration(milliseconds: 400),
                      child: Container(
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
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Network Fee',
                                  style: TextStyle(
                                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                  ),
                                ),
                                Text(
                                  _feeDetails != null 
                                      ? _isFiat 
                                          ? '${_getCurrencySymbol(_selectedFiatCurrency)} ${_numberFormat.format(
                                              double.parse(_feeDetails!['feeUSD']) * 
                                              (_selectedFiatCurrency == 'USD' ? 1 : _userCurrencyRate)
                                            )}'
                                          : '≈ ${double.parse(_feeDetails!['feeAmount']).toStringAsFixed(8)} ${_selectedCoin?.symbol}'
                                      : '- ${_isFiat ? _selectedFiatCurrency : _selectedCoin?.symbol}',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'You will receive',
                                  style: TextStyle(
                                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                  ),
                                ),
                                Text(
                                  _receiveAmount != null
                                      ? _isFiat
                                          ? '${_getCurrencySymbol(_selectedFiatCurrency)} ${_numberFormat.format(
                                              double.parse(_feeDetails!['receiveAmount']) * 
                                              double.parse(widget.asset['token']?['currentPrice'] ?? '0') *
                                              (_selectedFiatCurrency == 'USD' ? 1 : _userCurrencyRate)
                                            )}'
                                          : '≈ ${_receiveAmount!.toStringAsFixed(4)} ${_selectedCoin?.symbol}'
                                      : '0.0000 ${_isFiat ? _selectedFiatCurrency : _selectedCoin?.symbol}',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Warning Message
                  if (_warningMessage != null)
                    FadeInDown(
                      duration: const Duration(milliseconds: 600),
                      delay: const Duration(milliseconds: 500),
                      child: Container(
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
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Warning',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _warningMessage!,
                              style: TextStyle(
                                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Withdraw Button
                  FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    delay: const Duration(milliseconds: 600),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          // Validate inputs
                          final isAddressValid = _validateAddress(_addressController.text);
                          final isAmountValid = _validateAmount(_amountController.text);

                          if (!isAddressValid || !isAmountValid) {
                            return;
                          }

                          // Save address to recent addresses
                          await _saveAddress(_addressController.text);

                          // Show confirmation dialog
                          final confirmed = await _showConfirmationDialog();
                          if (!confirmed) {
                            return;
                          }

                          // Authenticate with biometrics
                          final authenticated = await BiometricService.authenticate();
                          if (!authenticated) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Authentication failed'),
                                  backgroundColor: SafeJetColors.error,
                                ),
                              );
                            }
                            return;
                          }

                          // Show 2FA dialog
                          final code = await showDialog<String>(
                            context: context,
                            builder: (context) => const TwoFactorDialog(),
                          );

                          if (code == null) {
                            return;
                          }

                          // TODO: Validate 2FA code
                          if (code != '123456') { // Example validation
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Invalid 2FA code'),
                                backgroundColor: SafeJetColors.error,
                              ),
                            );
                            return;
                          }

                          // TODO: Process withdrawal
                          // Show success message
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Withdrawal initiated successfully'),
                                backgroundColor: SafeJetColors.success,
                              ),
                            );
                            Navigator.pop(context);
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: SafeJetColors.secondaryHighlight,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: const Text(
                          'Withdraw',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
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
      ),
    );
  }

  Widget _buildCoinSelection(ThemeData theme, bool isDark) {
    return GestureDetector(
      onTap: _handleCoinSelection,
      child: ListTile(
        leading: Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            image: _selectedCoin?.iconUrl != null
                ? DecorationImage(
                    image: NetworkImage(_selectedCoin!.iconUrl!),
                    fit: BoxFit.cover,
                  )
                : null,
          ),
          child: _selectedCoin?.iconUrl == null
              ? Center(
                  child: Text(
                    _selectedCoin?.symbol[0] ?? 'S',
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                )
              : null,
        ),
        title: Text(
          _selectedCoin?.name ?? 'Select Coin',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        subtitle: Text(
          _selectedCoin?.symbol ?? 'Choose a coin to withdraw',
          style: TextStyle(
            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
            fontSize: 13,
          ),
        ),
        trailing: _selectedCoin != null ? Text(
          '${_selectedCoin!.networks.length} ${_selectedCoin!.networks.length == 1 ? 'network' : 'networks'}',
          style: TextStyle(
            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
            fontSize: 12,
          ),
        ) : null,
      ),
    );
  }
} 