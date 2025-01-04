import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';

class P2PTradingPreferencesScreen extends StatefulWidget {
  const P2PTradingPreferencesScreen({super.key});

  @override
  State<P2PTradingPreferencesScreen> createState() => _P2PTradingPreferencesScreenState();
}

class _P2PTradingPreferencesScreenState extends State<P2PTradingPreferencesScreen> {
  String _selectedCurrency = 'NGN';
  String _selectedPaymentMethod = 'bank';
  bool _autoAcceptOrders = false;
  bool _onlyVerifiedUsers = true;
  double _sliderValue = 50000;
  
  final List<Map<String, dynamic>> _currencies = const [
    {'code': 'NGN', 'name': 'Nigerian Naira', 'symbol': '₦'},
    {'code': 'USD', 'name': 'US Dollar', 'symbol': '\$'},
    {'code': 'EUR', 'name': 'Euro', 'symbol': '€'},
    {'code': 'GBP', 'name': 'British Pound', 'symbol': '£'},
  ];

  final List<Map<String, dynamic>> _paymentMethods = const [
    {'id': 'bank', 'name': 'Bank Transfer', 'icon': Icons.account_balance},
    {'id': 'paypal', 'name': 'PayPal', 'icon': Icons.payment},
    {'id': 'cashapp', 'name': 'Cash App', 'icon': Icons.attach_money},
    {'id': 'wise', 'name': 'Wise', 'icon': Icons.currency_exchange},
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Trading Preferences',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          FadeInDown(
            duration: const Duration(milliseconds: 600),
            child: _buildCurrencySection(isDark),
          ),
          const SizedBox(height: 24),
          FadeInDown(
            duration: const Duration(milliseconds: 600),
            delay: const Duration(milliseconds: 200),
            child: _buildPaymentMethodSection(isDark),
          ),
          const SizedBox(height: 24),
          FadeInDown(
            duration: const Duration(milliseconds: 600),
            delay: const Duration(milliseconds: 400),
            child: _buildTradingSettingsSection(isDark),
          ),
          const SizedBox(height: 24),
          FadeInDown(
            duration: const Duration(milliseconds: 600),
            delay: const Duration(milliseconds: 600),
            child: _buildLimitsSection(isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrencySection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(
          'Default Currency',
          'Set your preferred currency for P2P trading',
          Icons.currency_exchange,
          isDark,
        ),
        const SizedBox(height: 16),
        Container(
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
            children: _currencies.map((currency) {
              final isSelected = currency['code'] == _selectedCurrency;
              return Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => setState(() => _selectedCurrency = currency['code']),
                  borderRadius: BorderRadius.circular(16),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? SafeJetColors.secondaryHighlight
                                : (isDark
                                    ? Colors.white.withOpacity(0.05)
                                    : Colors.black.withOpacity(0.05)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Text(
                              currency['symbol'],
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: isSelected ? Colors.black : null,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                currency['code'],
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                currency['name'],
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
                        if (isSelected)
                          const Icon(
                            Icons.check_circle,
                            color: SafeJetColors.success,
                          ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentMethodSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(
          'Default Payment Method',
          'Choose your primary payment method',
          Icons.payments_outlined,
          isDark,
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.5,
          ),
          itemCount: _paymentMethods.length,
          itemBuilder: (context, index) {
            final method = _paymentMethods[index];
            final isSelected = method['id'] == _selectedPaymentMethod;
            return InkWell(
              onTap: () => setState(() => _selectedPaymentMethod = method['id']),
              borderRadius: BorderRadius.circular(16),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: isSelected
                      ? SafeJetColors.secondaryHighlight.withOpacity(0.1)
                      : (isDark
                          ? SafeJetColors.primaryAccent.withOpacity(0.1)
                          : SafeJetColors.lightCardBackground),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected
                        ? SafeJetColors.secondaryHighlight
                        : (isDark
                            ? SafeJetColors.primaryAccent.withOpacity(0.2)
                            : SafeJetColors.lightCardBorder),
                  ),
                ),
                child: Stack(
                  children: [
                    if (isSelected)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: SafeJetColors.secondaryHighlight,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.check,
                            size: 12,
                            color: Colors.black,
                          ),
                        ),
                      ),
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            method['icon'],
                            size: 32,
                            color: isSelected
                                ? SafeJetColors.secondaryHighlight
                                : null,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            method['name'],
                            style: TextStyle(
                              fontWeight: isSelected
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                              color: isSelected
                                  ? SafeJetColors.secondaryHighlight
                                  : null,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildTradingSettingsSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(
          'Trading Settings',
          'Configure your trading preferences',
          Icons.settings_outlined,
          isDark,
        ),
        const SizedBox(height: 16),
        Container(
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
              _buildSettingTile(
                'Auto-accept Orders',
                'Automatically accept orders that match your preferences',
                Switch(
                  value: _autoAcceptOrders,
                  onChanged: (value) => setState(() => _autoAcceptOrders = value),
                  activeColor: SafeJetColors.secondaryHighlight,
                ),
                isDark,
              ),
              const Divider(),
              _buildSettingTile(
                'Only Verified Users',
                'Only trade with KYC verified users',
                Switch(
                  value: _onlyVerifiedUsers,
                  onChanged: (value) => setState(() => _onlyVerifiedUsers = value),
                  activeColor: SafeJetColors.secondaryHighlight,
                ),
                isDark,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLimitsSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader(
          'Trading Limits',
          'View and manage your trading limits',
          Icons.bar_chart,
          isDark,
        ),
        const SizedBox(height: 16),
        Container(
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Current Limit',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '₦${_sliderValue.toStringAsFixed(0)}',
                        style: TextStyle(
                          color: SafeJetColors.secondaryHighlight,
                          fontWeight: FontWeight.bold,
                          fontSize: 24,
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
                      color: SafeJetColors.success.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.verified,
                          color: SafeJetColors.success,
                          size: 16,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Level 2',
                          style: TextStyle(
                            color: SafeJetColors.success,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  activeTrackColor: SafeJetColors.secondaryHighlight,
                  inactiveTrackColor: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                  thumbColor: SafeJetColors.secondaryHighlight,
                  overlayColor: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                ),
                child: Slider(
                  value: _sliderValue,
                  min: 10000,
                  max: 100000,
                  divisions: 9,
                  label: '₦${_sliderValue.toStringAsFixed(0)}',
                  onChanged: (value) {
                    setState(() => _sliderValue = value);
                  },
                ),
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: () {
                  // TODO: Navigate to verification screen
                },
                icon: const Icon(Icons.arrow_upward),
                label: const Text('Increase Limits'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: SafeJetColors.secondaryHighlight,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSectionHeader(
    String title,
    String subtitle,
    IconData icon,
    bool isDark,
  ) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: SafeJetColors.secondaryHighlight.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: SafeJetColors.secondaryHighlight,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingTile(
    String title,
    String subtitle,
    Widget trailing,
    bool isDark,
  ) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
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
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          trailing,
        ],
      ),
    );
  }
} 