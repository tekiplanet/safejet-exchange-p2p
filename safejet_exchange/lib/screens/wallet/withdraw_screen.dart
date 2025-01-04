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

class WithdrawScreen extends StatefulWidget {
  const WithdrawScreen({super.key});

  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  late Coin _selectedCoin;
  late Network _selectedNetwork;
  final _addressController = TextEditingController();
  final _amountController = TextEditingController();
  bool _maxAmount = false;
  String? _addressError;
  String? _amountError;
  bool _isFiat = false;
  String _selectedFiat = 'USD';
  
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
    
    final rates = _conversionRates[_selectedCoin.symbol];
    if (rates == null) return 0;
    
    if (toFiat) {
      return parsedAmount * (rates[_selectedFiat] ?? 0);
    } else {
      return parsedAmount / (rates[_selectedFiat] ?? 1);
    }
  }

  String _getFormattedAmount() {
    if (_amountController.text.isEmpty) return '';
    final amount = double.tryParse(_amountController.text) ?? 0;
    return _isFiat 
        ? '≈ ${_convertAmount(_amountController.text, false).toStringAsFixed(8)} ${_selectedCoin.symbol}'
        : '≈ ${_convertAmount(_amountController.text, true).toStringAsFixed(2)} $_selectedFiat';
  }

  @override
  void initState() {
    super.initState();
    _selectedCoin = coins[0];
    _selectedNetwork = _selectedCoin.networks[0];
  }

  @override
  void dispose() {
    _addressController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  // Add validation methods
  bool _validateAddress(String address) {
    if (address.isEmpty) {
      setState(() => _addressError = 'Address is required');
      return false;
    }

    switch (_selectedNetwork.name) {
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

    final coinAmount = _isFiat ? _convertAmount(amount, false) : parsedAmount;
    const maxAmount = 0.2384; // Example max amount in coin
    
    if (coinAmount > maxAmount) {
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
            _buildConfirmationRow('Amount:', '${_amountController.text} ${_selectedCoin.symbol}'),
            _buildConfirmationRow('Network Fee:', '0.0001 ${_selectedCoin.symbol}'),
            _buildConfirmationRow('You will receive:', '${(double.parse(_amountController.text) - 0.0001).toStringAsFixed(4)} ${_selectedCoin.symbol}'),
            _buildConfirmationRow('Network:', _selectedNetwork.name),
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
    await getIt<AddressService>().addRecentAddress(
      RecentAddress(
        address: address,
        coin: _selectedCoin.symbol,
        network: _selectedNetwork.name,
        lastUsed: DateTime.now(),
      ),
    );
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
                    child: GestureDetector(
                      onTap: () async {
                        final result = await showModalBottomSheet<Coin>(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (context) => const CoinSelectionModal(),
                        );
                        if (result != null) {
                          setState(() {
                            _selectedCoin = result;
                            _selectedNetwork = result.networks[0];
                          });
                        }
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
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: SafeJetColors.secondaryHighlight,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.currency_bitcoin,
                                color: Colors.black,
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _selectedCoin.name,
                                    style: theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    _selectedCoin.symbol,
                                    style: TextStyle(
                                      color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Icon(
                              Icons.chevron_right_rounded,
                              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                            ),
                          ],
                        ),
                      ),
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
                                      selectedCoin: _selectedCoin.symbol,
                                      selectedNetwork: _selectedNetwork.name,
                                      addressService: getIt<AddressService>(),
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
                                    _selectedCoin.symbol,
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
                                        _amountController.text = _isFiat 
                                            ? _convertAmount('0.2384', true).toStringAsFixed(2)
                                            : '0.2384';
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
                            final result = await showModalBottomSheet<Network>(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (context) => NetworkSelectionModal(
                                networks: _selectedCoin.networks,
                                selectedNetwork: _selectedNetwork,
                              ),
                            );
                            if (result != null) {
                              setState(() => _selectedNetwork = result);
                            }
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
                                        _selectedNetwork.name,
                                        style: theme.textTheme.titleSmall?.copyWith(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Average arrival time: ${_selectedNetwork.arrivalTime}',
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
                                '0.0001 BTC',
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
                                '0.2383 BTC',
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

                  // Withdraw Button
                  FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    delay: const Duration(milliseconds: 500),
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
} 