import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/theme/colors.dart';
import 'package:animate_do/animate_do.dart';
import '../../widgets/custom_app_bar.dart';
import 'package:provider/provider.dart';
import '../../config/theme/theme_provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../widgets/coin_selection_modal.dart';
import 'package:share_plus/share_plus.dart';
import '../../widgets/network_selection_modal.dart';
import '../../models/coin.dart';
import 'package:get_it/get_it.dart';
import '../../services/wallet_service.dart';

class DepositScreen extends StatefulWidget {
  final Map<String, dynamic> asset;
  final bool showInUSD;
  final double userCurrencyRate;
  final String userCurrency;

  const DepositScreen({
    super.key,
    required this.asset,
    required this.showInUSD,
    required this.userCurrencyRate,
    required this.userCurrency,
  });

  @override
  State<DepositScreen> createState() => _DepositScreenState();
}

class _DepositScreenState extends State<DepositScreen> {
  final _walletService = GetIt.I<WalletService>();
  String? _depositAddress;
  String? _networkVersion;
  bool _isLoading = false;
  late Coin _selectedCoin;
  late Network _selectedNetwork;

  @override
  void initState() {
    super.initState();
    // Initialize with the asset's coin and network
    final token = widget.asset['token'] as Map<String, dynamic>;
    final metadata = token['metadata'] as Map<String, dynamic>;
    final networks = List<String>.from(metadata['networks'] ?? ['mainnet']);
    
    _selectedCoin = Coin(
      symbol: token['symbol'],
      name: token['name'],
      networks: networks.map((network) => Network(
        name: network, // Use actual network from metadata
        arrivalTime: '10-30 minutes',
        isActive: true,
      )).toList(),
    );
    _selectedNetwork = _selectedCoin.networks[0];
    _fetchDepositAddress();
  }

  Future<void> _fetchDepositAddress() async {
    setState(() => _isLoading = true);
    try {
      final token = widget.asset['token'] as Map<String, dynamic>;
      debugPrint('Token data: $token');
      debugPrint('Selected network: ${_selectedNetwork.name}');

      final response = await _walletService.getDepositAddress(
        token['id'],
        network: _selectedNetwork.name.toLowerCase(), // This will now be 'testnet' or 'mainnet'
      );
      setState(() {
        _depositAddress = response['address'];
        _networkVersion = response['networkVersion'];
      });
    } catch (e) {
      debugPrint('Error getting deposit address: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to get deposit address: ${e.toString()}')),
      );
    } finally {
      setState(() => _isLoading = false);
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
                  // Coin Selection Card
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
                            _selectedNetwork = result.networks[0]; // Reset to first network
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
                            // Coin Icon
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
                            // Coin Info
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
                                    'BTC',
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

                  // Network Selection
                  FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    delay: const Duration(milliseconds: 100),
                    child: Text(
                      'Select Network',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Network Card
                  FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    delay: const Duration(milliseconds: 200),
                    child: GestureDetector(
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
                          setState(() {
                            _selectedNetwork = result;
                          });
                          _fetchDepositAddress(); // Fetch new address for selected network
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
                                    '${_selectedNetwork.name}${_networkVersion != null ? ' ($_networkVersion)' : ''}',
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
                  ),

                  const SizedBox(height: 24),

                  // QR Code Section
                  FadeInDown(
                    duration: const Duration(milliseconds: 600),
                    delay: const Duration(milliseconds: 300),
                    child: Container(
                      padding: const EdgeInsets.all(20),
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
                          // QR Code
                          _buildAddressSection(),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Warning Notice
                  _buildWarningNotice(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWarningNotice() {
    return FadeInDown(
      duration: const Duration(milliseconds: 600),
      delay: const Duration(milliseconds: 400),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: SafeJetColors.error.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: SafeJetColors.error.withOpacity(0.2),
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.warning_rounded,
              color: SafeJetColors.error,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Send only ${widget.asset['token']['symbol']} ' +
                (_networkVersion != null ? '($_networkVersion) ' : '') +
                'to this deposit address. ' +
                'Sending any other coin or token may result in permanent loss.',
                style: TextStyle(
                  color: SafeJetColors.error,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressSection() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return _isLoading 
      ? const Center(child: CircularProgressIndicator())
      : Column(
          children: [
            // QR Code
            if (_depositAddress != null)
              QrImageView(
                data: _depositAddress!,
                version: QrVersions.auto,
                size: 200.0,
                backgroundColor: Colors.white,
              ),
            const SizedBox(height: 20),
            // Address with Copy/Share
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
              decoration: BoxDecoration(
                color: isDark 
                    ? Colors.black.withOpacity(0.2)
                    : Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _depositAddress ?? 'Loading address...',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  IconButton(
                    onPressed: _depositAddress == null ? null : () {
                      Clipboard.setData(ClipboardData(
                        text: _depositAddress!,
                      ));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Address copied to clipboard'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    icon: const Icon(Icons.copy_rounded),
                    color: SafeJetColors.secondaryHighlight,
                  ),
                  IconButton(
                    onPressed: _depositAddress == null ? null : () {
                      Share.share(
                        'My ${widget.asset['token']['symbol']} deposit address:\n\n$_depositAddress\n\nNetwork: ${_selectedNetwork.name}${_networkVersion != null ? ' ($_networkVersion)' : ''}',
                        subject: 'My ${widget.asset['token']['symbol']} Deposit Address',
                      );
                    },
                    icon: const Icon(Icons.share_rounded),
                    color: SafeJetColors.secondaryHighlight,
                  ),
                ],
              ),
            ),
          ],
        );
  }
} 