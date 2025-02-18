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
    
    // Get token price from current asset data
    final tokenPrice = double.tryParse(_currentAsset['token']?['currentPrice']?.toString() ?? '0') ?? 0.0;
    
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

      // Recalculate fee when network changes
      _onAmountChanged();
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
      final tokenAmount = _isFiat 
          ? _convertAmount(_amountController.text, false)
          : inputAmount;

      // Get network metadata which contains the correct token ID for each network
      final networks = _currentAsset['metadata']['networks'] as Map<String, dynamic>;
      
      // Get network data directly using the network key
      final networkKey = '${_selectedNetwork!.blockchain}_${_selectedNetwork!.network}';
      final networkData = networks[networkKey] as Map<String, dynamic>?;
      
      if (networkData == null) {
        print('Network not found: $networkKey');
        throw Exception('Network configuration not found');
      }

      // Calculate fee using token amount with network-specific token ID
      final feeDetails = await _walletService.calculateWithdrawalFee(
        tokenId: networkData['tokenId'] as String,
        amount: tokenAmount,
        networkVersion: networkData['networkVersion'] as String,
        network: networkData['network'] as String,
      );

      print('Fee calculation successful:');
      print('Fee Details: $feeDetails');

      setState(() {
        _feeDetails = feeDetails;
        _receiveAmount = double.parse(feeDetails['receiveAmount']);
      });
    } catch (e) {
      print('Error calculating fee: $e');
      print('Current network data: $_selectedNetwork');
      print('Current token data: ${_currentAsset['token']}');
      print('Network metadata: ${_currentAsset['metadata']['networks']}');
      setState(() {
        _feeDetails = null;
        _receiveAmount = null;
      });
    }
  }

  // Add validation methods
  bool _validateAddress(String address) {
    if (address.isEmpty) {
      setState(() => _addressError = 'Address is required');
      return false;
    }

    final networkName = _selectedNetwork?.name.toUpperCase() ?? '';
    print('Validating address: $address');
    print('Full Network Name: $networkName');  // Debug full network name

    // Bitcoin validation
    if (networkName.contains('BITCOIN') || networkName.contains('BTC')) {
      // Check for all valid Bitcoin address formats (both mainnet and testnet)
      if (!address.startsWith('1') && 
          !address.startsWith('3') && 
          !address.startsWith('bc1') &&
          !address.startsWith('m') && 
          !address.startsWith('n') && 
          !address.startsWith('2') && 
          !address.startsWith('tb1')) {
        setState(() => _addressError = 'Invalid Bitcoin address');
        return false;
      }

      // Length validation (covers both mainnet and testnet)
      if (address.length < 26 || address.length > 89) {
        setState(() => _addressError = 'Invalid Bitcoin address length');
        return false;
      }
    }
    // Ethereum and BSC validation
    else if (networkName.contains('ETH') || networkName.contains('ERC20') || 
             networkName.contains('BSC') || networkName.contains('BEP20')) {
      if (!address.startsWith('0x')) {
        setState(() => _addressError = 'Invalid address format');
        return false;
      }
      if (address.length != 42) {
        setState(() => _addressError = 'Invalid address length');
        return false;
      }
    }
    // TRON validation
    else if (networkName.contains('TRX') || networkName.contains('TRON') || networkName.contains('TRC20')) {
      if (!address.startsWith('T')) {
        setState(() => _addressError = 'Invalid TRON address');
        return false;
      }
      if (address.length != 34) {
        setState(() => _addressError = 'Invalid address length');
        return false;
      }
    }
    // XRP validation
    else if (networkName.contains('XRP') || networkName.contains('RIPPLE')) {
      if (!address.startsWith('r')) {
        setState(() => _addressError = 'Invalid XRP address');
        return false;
      }
      if (address.length < 25 || address.length > 35) {
        setState(() => _addressError = 'Invalid XRP address length');
        return false;
      }
    }

    // If we get here, the address is valid for the selected network
    print('Address validation passed');
    setState(() => _addressError = null);
    return true;
  }

  bool _validateAmount(String amount) {
    // Update debug prints to use _currentAsset
    print('Asset data: $_currentAsset');
    print('Asset type: ${_currentAsset['type']}');
    print('Asset balance: ${_currentAsset['balance']}');
    
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
        // Only match by symbol, don't filter by network yet
        final newAsset = data['balances'].firstWhere(
          (b) => b['baseSymbol'] == result.symbol,
          orElse: () => null,
        );

        if (newAsset != null) {
          setState(() {
            _currentAsset = newAsset;
            _selectedCoin = result;
            _selectedNetwork = result.networks[0];
            _amountController.clear();
            _amountError = null;
            _maxAmount = false;
            _feeDetails = null;
          });
          
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
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                children: [
                                  _AddressInputButton(
                                    icon: Icons.qr_code_scanner,
                                    label: 'Scan QR',
                                    onTap: () async {
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
                                  _AddressInputButton(
                                    icon: Icons.book_outlined,
                                    label: 'Address Book',
                                    onTap: () async {
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
                                  _AddressInputButton(
                                    icon: Icons.paste_rounded,
                                    label: 'Paste',
                                    onTap: () async {
                                      final data = await Clipboard.getData('text/plain');
                                      if (data?.text != null) {
                                        setState(() {
                                          _addressController.text = data!.text!;
                                          _validateAddress(data.text!);
                                        });
                                      }
                                    },
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              TextField(
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
                                ),
                              ),
                              if (_addressError != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8, left: 4),
                                  child: Align(
                                    alignment: Alignment.centerLeft,
                                    child: Text(
                                      _addressError!,
                                      style: TextStyle(
                                        color: SafeJetColors.error,
                                        fontSize: 12,
                                      ),
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
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Amount',
                                    style: theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Available: ${_currentAsset['balance']?.toString() ?? '0.00'} ${_selectedCoin?.symbol}',
                                    style: TextStyle(
                                      color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: isDark 
                                      ? Colors.grey[900]
                                      : Colors.grey[100],
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    _CurrencyTab(
                                      label: _selectedCoin?.symbol ?? '',
                                      isSelected: !_isFiat,
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
                                    _CurrencyTab(
                                      label: 'USD',
                                      isSelected: _isFiat && _selectedFiatCurrency == 'USD',
                                      onSelected: (selected) {
                                        if (selected) {
                                          setState(() {
                                            _isFiat = true;
                                            _selectedFiatCurrency = 'USD';
                                            _amountController.clear();
                                            _feeDetails = null;
                                          });
                                        }
                                      },
                                    ),
                                    _CurrencyTab(
                                      label: _userCurrency,
                                      isSelected: _isFiat && _selectedFiatCurrency == _userCurrency,
                                      onSelected: (selected) {
                                        if (selected) {
                                          setState(() {
                                            _isFiat = true;
                                            _selectedFiatCurrency = _userCurrency;
                                            _amountController.clear();
                                            _feeDetails = null;
                                          });
                                        }
                                      },
                                    ),
                                  ],
                                ),
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
                                      _amountError = null;
                                      _maxAmount = false;
                                      _feeDetails = null;
                                      _receiveAmount = null;
                                    });
                                    
                                    _updateWarningMessage();
                                    await _onAmountChanged();
                                    
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
                                              double.parse(_currentAsset['token']?['currentPrice'] ?? '0') *  // Use _currentAsset here
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

class _CurrencyTab extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Function(bool) onSelected;

  const _CurrencyTab({
    required this.label,
    required this.isSelected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return GestureDetector(
      onTap: () => onSelected(true),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected 
              ? (isDark ? SafeJetColors.secondaryHighlight.withOpacity(0.2) : SafeJetColors.secondaryHighlight.withOpacity(0.15))
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: isSelected 
              ? Border.all(
                  color: SafeJetColors.secondaryHighlight.withOpacity(0.3),
                  width: 1,
                )
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected
                ? (isDark ? Colors.white : Colors.black)
                : (isDark ? Colors.grey[400] : Colors.grey[600]),
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

class _AddressInputButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _AddressInputButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
              size: 20,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
} 