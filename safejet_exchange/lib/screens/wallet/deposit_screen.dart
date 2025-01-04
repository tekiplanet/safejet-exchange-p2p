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

class DepositScreen extends StatefulWidget {
  const DepositScreen({super.key});

  @override
  State<DepositScreen> createState() => _DepositScreenState();
}

class _DepositScreenState extends State<DepositScreen> {
  late Coin _selectedCoin;
  late Network _selectedNetwork;

  @override
  void initState() {
    super.initState();
    _selectedCoin = coins[0]; // Default to Bitcoin
    _selectedNetwork = _selectedCoin.networks[0]; // Default to first network
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
                          QrImageView(
                            data: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                            version: QrVersions.auto,
                            size: 200,
                            backgroundColor: Colors.white,
                            padding: const EdgeInsets.all(16),
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
                                    'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                                    style: theme.textTheme.bodyMedium,
                                  ),
                                ),
                                IconButton(
                                  onPressed: () {
                                    Clipboard.setData(const ClipboardData(
                                      text: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
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
                                  onPressed: () {
                                    Share.share(
                                      'My Bitcoin deposit address:\n\nbc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\n\nNetwork: Bitcoin (BTC)',
                                      subject: 'My Bitcoin Deposit Address',
                                    );
                                  },
                                  icon: const Icon(Icons.share_rounded),
                                  color: SafeJetColors.secondaryHighlight,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Warning Notice
                  FadeInDown(
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
                              'Send only BTC to this deposit address. Sending any other coin may result in permanent loss.',
                              style: TextStyle(
                                color: SafeJetColors.error,
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
          ),
        ),
      ),
    );
  }
} 