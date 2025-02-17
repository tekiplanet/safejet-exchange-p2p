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

  String _selectedFiat = 'USD'; // Default to USD
  bool get _showInUSD => widget.showInUSD;
  String get _userCurrency => widget.userCurrency;
  double get _userCurrencyRate => widget.userCurrencyRate;

  final Map<String, Map<String, double>> _conversionRates = {
    'BTC': {
      'USD': 43000.0,
      'NGN': 53750000.0,
    },
    'ETH': {
      'USD': 2250.0,
      'NGN': 2812500.0,
    },
  };

  double _convertAmount(String amount, bool toFiat) {
    if (amount.isEmpty) return 0;
    final parsedAmount = double.tryParse(amount) ?? 0;
    
    if (toFiat) {
      return parsedAmount * (_showInUSD ? 1 : _userCurrencyRate);
    } else {
      return parsedAmount / (_showInUSD ? 1 : _userCurrencyRate);
    }
  }

  String _getFormattedAmount() {
    if (_amountController.text.isEmpty) return '';
    final amount = double.tryParse(_amountController.text) ?? 0;
    return _isFiat 
        ? '≈ ${_convertAmount(_amountController.text, false).toStringAsFixed(8)} ${_selectedCoin?.symbol}'
        : '≈ ${_convertAmount(_amountController.text, true).toStringAsFixed(2)} ${_showInUSD ? 'USD' : _userCurrency}';
  }

  @override
  void initState() {
    super.initState();
    _selectedCoin = null;
    _selectedNetwork = null;
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
    final token = widget.asset['token'] as Map<String, dynamic>;
    final metadata = token['metadata'] as Map<String, dynamic>;

    _selectedCoin = Coin(
      id: token['id'],
      symbol: token['symbol'],
      name: token['name'],
      networks: [
        Network(
          name: metadata['networks']?.first ?? 'mainnet',
          blockchain: token['blockchain'],
          version: token['networkVersion'],
          arrivalTime: '10-30 minutes',
          network: metadata['networks']?.first ?? 'mainnet',
        )
      ],
      iconUrl: metadata['icon'],
    );
    _selectedNetwork = _selectedCoin?.networks[0];

    // Set initial warning message
    _updateWarningMessage();
  }

  void _updateWarningMessage() {
    setState(() {
      if (_selectedCoin == null || _selectedNetwork == null) {
        _warningMessage = null;  // Clear warning when no coin selected
        return;
      }
      
      _warningMessage = 'Send ${_selectedCoin!.symbol} only through '
          '${_selectedNetwork!.version} on ${_selectedNetwork!.blockchain}. '
          'Using other networks may result in permanent loss.';
    });
  }

  Future<void> _onAmountChanged() async {
    if (_amountController.text.isEmpty || _selectedCoin == null || _selectedNetwork == null) {
      setState(() {
        _feeDetails = null;
        _receiveAmount = null;
      });
      return;
    }

    final amount = double.tryParse(_amountController.text);
    if (amount == null) return;

    try {
      final feeDetails = await _walletService.calculateWithdrawalFee(
        tokenId: _selectedCoin!.id,
        amount: amount,
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

    // Get actual balance from asset
    final balance = double.tryParse(widget.asset['balance'].toString()) ?? 0.0;
    final coinAmount = _isFiat ? _convertAmount(amount, false) : parsedAmount;
    
    if (coinAmount > balance) {
      setState(() => _amountError = 'Insufficient balance');
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
      setState(() {
        _selectedCoin = result;
        _selectedNetwork = result.networks[0];
        _updateWarningMessage();
      });
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
                        GestureDetector(
                          onTap: _handleCoinSelection,
                          child: _buildCoinSelection(theme, isDark),
                        ),
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
                                        color: _isFiat && _selectedFiat == 'USD' 
                                            ? Colors.black 
                                            : (isDark ? Colors.grey[400] : Colors.grey[600]),
                                        fontWeight: _isFiat && _selectedFiat == 'USD' ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                    selected: _isFiat && _selectedFiat == 'USD',
                                    selectedColor: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                                    backgroundColor: Colors.transparent,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                      side: BorderSide(
                                        color: _isFiat && _selectedFiat == 'USD'
                                            ? SafeJetColors.secondaryHighlight.withOpacity(0.3)
                                            : Colors.transparent,
                                      ),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    onSelected: (selected) {
                                      if (selected) {
                                        setState(() {
                                          _isFiat = true;
                                          _selectedFiat = 'USD';
                                          if (_amountController.text.isNotEmpty) {
                                            _amountController.text = _convertAmount(_amountController.text, true).toStringAsFixed(2);
                                          }
                                        });
                                      }
                                    },
                                  ),
                                  const SizedBox(width: 8),
                                  ChoiceChip(
                                    label: Text(
                                      'NGN',
                                      style: TextStyle(
                                        color: _isFiat && _selectedFiat == 'NGN' 
                                            ? Colors.black 
                                            : (isDark ? Colors.grey[400] : Colors.grey[600]),
                                        fontWeight: _isFiat && _selectedFiat == 'NGN' ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                    selected: _isFiat && _selectedFiat == 'NGN',
                                    selectedColor: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                                    backgroundColor: Colors.transparent,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                      side: BorderSide(
                                        color: _isFiat && _selectedFiat == 'NGN'
                                            ? SafeJetColors.secondaryHighlight.withOpacity(0.3)
                                            : Colors.transparent,
                                      ),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    onSelected: (selected) {
                                      if (selected) {
                                        setState(() {
                                          _isFiat = true;
                                          _selectedFiat = 'NGN';
                                          if (_amountController.text.isNotEmpty) {
                                            _amountController.text = _convertAmount(_amountController.text, true).toStringAsFixed(2);
                                          }
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
                                          prefixText: _isFiat ? (_selectedFiat == 'USD' ? '\$ ' : '₦ ') : '',
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
                                          final balance = double.tryParse(widget.asset['balance'].toString()) ?? 0.0;
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
                                      ? '${_feeDetails!['feeAmount']} ${_selectedCoin?.symbol}'
                                      : '- ${_selectedCoin?.symbol}',
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
                                  '${_receiveAmount?.toStringAsFixed(4) ?? '0.0000'} ${_selectedCoin?.symbol}',
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
    if (_selectedCoin == null) {
      return Container(
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
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isDark 
                    ? Colors.white.withOpacity(0.1)
                    : Colors.black.withOpacity(0.05),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                Icons.currency_exchange,
                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Select a coin',
              style: theme.textTheme.titleMedium?.copyWith(
                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
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
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
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
                      _selectedCoin!.symbol[0],
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _selectedCoin!.name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  _selectedCoin!.symbol,
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 8,
              vertical: 4,
            ),
            decoration: BoxDecoration(
              color: isDark 
                  ? Colors.white.withOpacity(0.1)
                  : Colors.black.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '${_selectedCoin!.networks.length} network${_selectedCoin!.networks.length > 1 ? 's' : ''}',
              style: TextStyle(
                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
} 