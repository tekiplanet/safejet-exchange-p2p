import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/custom_app_bar.dart';
import 'p2p_chat_screen.dart';
import 'p2p_order_confirmation_screen.dart';
import '../../services/p2p_service.dart';

class P2POfferDetailsScreen extends StatefulWidget {
  final bool isBuy;
  final String offerId;
  final Map<String, dynamic> offerDetails;

  const P2POfferDetailsScreen({
    super.key,
    required this.isBuy,
    required this.offerId,
    required this.offerDetails,
  });

  @override
  State<P2POfferDetailsScreen> createState() => _P2POfferDetailsScreenState();
}

class _P2POfferDetailsScreenState extends State<P2POfferDetailsScreen> {
  final _amountController = TextEditingController();
  bool _termsAccepted = false;
  Map<String, dynamic>? offerDetails;

  @override
  void initState() {
    super.initState();
    _fetchOfferDetails();
  }

  Future<void> _fetchOfferDetails() async {
    try {
      final p2pService = P2PService();
      final details = await p2pService.getOfferDetails(widget.offerId);
      setState(() {
        offerDetails = details;
      });
    } catch (e) {
      print('Error fetching offer details: $e');
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (offerDetails == null) {
      return Center(child: CircularProgressIndicator());
    }

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    // Extract offer details
    final offer = offerDetails!;
    final token = offer['token'] ?? {};
    final tokenSymbol = token['symbol'] ?? 'Unknown';
    final availableAmount = double.tryParse(offer['amount'].toString()) ?? 0.0;
    final currency = offer['currency'] ?? 'Unknown';
    final minAmount = offer['metadata']['minAmount'] ?? 0;
    final maxAmount = offer['metadata']['maxAmount'] ?? 0;
    final paymentMethods = offer['paymentMethods'] ?? [];
    final terms = offer['terms'] ?? 'No terms provided';

    // Extract user details
    final user = offer['user'] ?? {};
    final userName = user['fullName'] ?? 'Unknown User';
    final userInitials = userName.isNotEmpty ? userName.substring(0, 1).toUpperCase() : 'U';
    final kycLevel = user['kycLevel'] ?? 'Unverified';

    print('User details: Name: $userName, KYC Level: $kycLevel');

    // Use the calculated price from the backend
    final price = offer['calculatedPrice'] ?? '0.00';

    return Scaffold(
      appBar: CustomAppBar(
        title: widget.isBuy ? 'Buy $tokenSymbol' : 'Sell $tokenSymbol',
        onNotificationTap: () {
          // TODO: Handle notification tap
        },
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
                  // Seller/Buyer Profile Section
                  FadeInUp(
                    duration: const Duration(milliseconds: 400),
                    child: _buildProfileSection(isDark, userName, userInitials, kycLevel),
                  ),
                  const SizedBox(height: 24),

                  // Price & Amount Section
                  FadeInUp(
                    duration: const Duration(milliseconds: 400),
                    delay: const Duration(milliseconds: 200),
                    child: _buildPriceSection(isDark, price, availableAmount, currency, tokenSymbol, minAmount, maxAmount),
                  ),
                  const SizedBox(height: 24),

                  // Payment Methods Section
                  FadeInUp(
                    duration: const Duration(milliseconds: 400),
                    delay: const Duration(milliseconds: 400),
                    child: _buildPaymentSection(isDark, paymentMethods),
                  ),
                  const SizedBox(height: 24),

                  // Terms & Conditions
                  FadeInUp(
                    duration: const Duration(milliseconds: 400),
                    delay: const Duration(milliseconds: 600),
                    child: _buildTermsSection(isDark, terms),
                  ),
                ],
              ),
            ),
          ),
          // Bottom Action Section
          _buildActionSection(isDark, currency),
        ],
      ),
    );
  }

  Widget _buildProfileSection(bool isDark, String userName, String userInitials, String kycLevel) {
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
          CircleAvatar(
            radius: 24,
            backgroundColor: SafeJetColors.secondaryHighlight,
            child: Text(userInitials),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      userName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: kycLevel == 'Verified' ? SafeJetColors.success.withOpacity(0.2) : Colors.grey.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.verified_rounded,
                            color: kycLevel == 'Verified' ? SafeJetColors.success : Colors.grey,
                            size: 14,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            kycLevel,
                            style: TextStyle(
                              color: kycLevel == 'Verified' ? SafeJetColors.success : Colors.grey,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '245 orders • 98.5% completion',
                  style: TextStyle(
                    color: isDark
                        ? Colors.grey[400]
                        : SafeJetColors.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: SafeJetColors.success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Online now',
                      style: TextStyle(
                        color: SafeJetColors.success,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceSection(bool isDark, String price, double availableAmount, String currency, String tokenSymbol, dynamic minAmount, dynamic maxAmount) {
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
                    'Price',
                    style: TextStyle(
                      color: isDark
                          ? Colors.grey[400]
                          : SafeJetColors.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$currency $price/$tokenSymbol',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: widget.isBuy
                      ? SafeJetColors.success.withOpacity(0.2)
                      : SafeJetColors.warning.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  widget.isBuy ? 'BUYING' : 'SELLING',
                  style: TextStyle(
                    color: widget.isBuy
                        ? SafeJetColors.success
                        : SafeJetColors.warning,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildInfoItem('Available', '${availableAmount.toStringAsFixed(2)} $tokenSymbol', isDark),
              _buildInfoItem('Limit', '${minAmount.toStringAsFixed(2)} - ${maxAmount.toStringAsFixed(2)} $tokenSymbol', isDark),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentSection(bool isDark, List<dynamic> paymentMethods) {
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Payment Methods',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          ...paymentMethods.map((method) {
            final typeName = method['typeName'] ?? 'Unknown';
            final description = method['description'] ?? 'No description available';
            final icon = _getIconForType(method['icon'] ?? 'payment');
            print('Payment Method: $method');
            return _buildPaymentMethod(
              typeName,
              description,
              icon,
              isDark,
            );
          }).toList(),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark
                      ? SafeJetColors.primaryAccent.withOpacity(0.1)
                      : SafeJetColors.lightCardBackground,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark
                        ? SafeJetColors.primaryAccent.withOpacity(0.2)
                        : SafeJetColors.lightCardBorder,
                  ),
                ),
                child: Icon(
                  Icons.info_outline,
                  color: isDark ? Colors.white : SafeJetColors.lightText,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Please only use the payment methods listed above. Other methods are not protected.',
                  style: TextStyle(
                    color: SafeJetColors.warning,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getIconForType(String iconName) {
    switch (iconName) {
      case 'bank':
        return Icons.account_balance;
      case 'mobile':
        return Icons.smartphone;
      case 'qr_code':
        return Icons.qr_code;
      case 'payment':
        return Icons.payment;
      default:
        return Icons.payment;
    }
  }

  Widget _buildInfoItem(String label, String value, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isDark
                ? Colors.grey[400]
                : SafeJetColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentMethod(String title, String subtitle, IconData icon, bool isDark) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark
                ? SafeJetColors.primaryAccent.withOpacity(0.1)
                : SafeJetColors.lightCardBackground,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? SafeJetColors.primaryAccent.withOpacity(0.2)
                  : SafeJetColors.lightCardBorder,
            ),
          ),
          child: Icon(
            icon,
            color: isDark ? Colors.white : SafeJetColors.lightText,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  color: isDark
                      ? Colors.grey[400]
                      : SafeJetColors.lightTextSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTermsSection(bool isDark, String terms) {
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Terms & Conditions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            terms,
            style: TextStyle(
              color: isDark
                  ? Colors.grey[400]
                  : SafeJetColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              SizedBox(
                height: 24,
                width: 24,
                child: Checkbox(
                  value: _termsAccepted,
                  onChanged: (value) {
                    setState(() => _termsAccepted = value ?? false);
                  },
                  activeColor: SafeJetColors.secondaryHighlight,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'I have read and agree to the terms & conditions',
                  style: TextStyle(
                    color: isDark
                        ? Colors.grey[400]
                        : SafeJetColors.lightTextSecondary,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionSection(bool isDark, String currency) {
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
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: 'Enter amount in $currency',
                    hintStyle: TextStyle(
                      color: isDark
                          ? Colors.grey[600]
                          : SafeJetColors.lightTextSecondary,
                    ),
                    filled: true,
                    fillColor: isDark
                        ? SafeJetColors.primaryAccent.withOpacity(0.1)
                        : SafeJetColors.lightCardBackground,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark
                            ? SafeJetColors.primaryAccent.withOpacity(0.2)
                            : SafeJetColors.lightCardBorder,
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark
                            ? SafeJetColors.primaryAccent.withOpacity(0.2)
                            : SafeJetColors.lightCardBorder,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: SafeJetColors.secondaryHighlight,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              TextButton(
                onPressed: () {
                  // TODO: Set max amount
                },
                style: TextButton.styleFrom(
                  foregroundColor: SafeJetColors.secondaryHighlight,
                ),
                child: const Text('MAX'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                'You will receive:',
                style: TextStyle(
                  color: isDark
                      ? Colors.grey[400]
                      : SafeJetColors.lightTextSecondary,
                ),
              ),
              const Spacer(),
              const Text(
                '0.00 USDT',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _termsAccepted ? () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => P2POrderConfirmationScreen(
                      isBuy: widget.isBuy,
                      amount: '1,234.56',  // Replace with actual amount
                      price: '750.00',     // Replace with actual price
                      total: '925,920.00', // Replace with actual total
                    ),
                  ),
                );
              } : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: widget.isBuy
                    ? SafeJetColors.success
                    : SafeJetColors.warning,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: Text(
                widget.isBuy ? 'Buy USDT' : 'Sell USDT',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
} 