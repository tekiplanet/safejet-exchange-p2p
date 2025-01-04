import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  final Map<String, Map<String, bool>> _settings = {
    'Trading': {
      'Order Updates': true,
      'Price Alerts': true,
      'Trade Confirmations': true,
      'Market Updates': false,
    },
    'P2P': {
      'New Messages': true,
      'Order Status': true,
      'Payment Confirmations': true,
      'Dispute Updates': true,
    },
    'Security': {
      'Login Alerts': true,
      'Device Changes': true,
      'Password Changes': true,
      'Suspicious Activity': true,
    },
    'Wallet': {
      'Deposits': true,
      'Withdrawals': true,
      'Transfer Confirmations': false,
      'Balance Updates': true,
    },
  };

  bool _masterToggle = true;

  @override
  void initState() {
    super.initState();
    _updateMasterToggle();
  }

  void _updateMasterToggle() {
    bool allEnabled = true;
    for (var category in _settings.values) {
      for (var enabled in category.values) {
        if (!enabled) {
          allEnabled = false;
          break;
        }
      }
    }
    setState(() => _masterToggle = allEnabled);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Notifications',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: Column(
        children: [
          _buildHeader(isDark),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
              itemCount: _settings.length,
              itemBuilder: (context, index) {
                final category = _settings.keys.elementAt(index);
                return FadeInUp(
                  duration: const Duration(milliseconds: 300),
                  delay: Duration(milliseconds: index * 100),
                  child: _buildCategory(category, _settings[category]!, isDark),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: const BorderRadius.vertical(
          bottom: Radius.circular(24),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: SafeJetColors.secondaryHighlight.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.notifications_active,
                  color: SafeJetColors.secondaryHighlight,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Notification Settings',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Customize your notification preferences',
                      style: TextStyle(
                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildMasterToggle(isDark),
        ],
      ),
    );
  }

  Widget _buildMasterToggle(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            _masterToggle ? Icons.notifications_active : Icons.notifications_off,
            color: _masterToggle
                ? SafeJetColors.success
                : (isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'All Notifications',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: _masterToggle
                        ? null
                        : (isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary),
                  ),
                ),
                Text(
                  _masterToggle ? 'Enabled' : 'Disabled',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: _masterToggle,
            onChanged: (value) {
              setState(() {
                _masterToggle = value;
                for (var category in _settings.keys) {
                  for (var key in _settings[category]!.keys) {
                    _settings[category]![key] = value;
                  }
                }
              });
            },
            activeColor: SafeJetColors.secondaryHighlight,
          ),
        ],
      ),
    );
  }

  Widget _buildCategory(String category, Map<String, bool> items, bool isDark) {
    final categoryIcon = _getCategoryIcon(category);
    final categoryColor = _getCategoryColor(category);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark
              ? SafeJetColors.primaryAccent.withOpacity(0.2)
              : SafeJetColors.lightCardBorder,
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: categoryColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    categoryIcon,
                    color: categoryColor,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  category,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          ...items.entries.map((entry) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: SwitchListTile(
                title: Text(
                  entry.key,
                  style: TextStyle(
                    fontSize: 15,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                value: entry.value,
                onChanged: (value) {
                  setState(() {
                    _settings[category]![entry.key] = value;
                    _updateMasterToggle();
                  });
                },
                activeColor: SafeJetColors.secondaryHighlight,
              ),
            );
          }).toList(),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'Trading':
        return Icons.trending_up;
      case 'P2P':
        return Icons.people;
      case 'Security':
        return Icons.security;
      case 'Wallet':
        return Icons.account_balance_wallet;
      default:
        return Icons.notifications;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'Trading':
        return const Color(0xFF4CAF50);
      case 'P2P':
        return const Color(0xFF2196F3);
      case 'Security':
        return const Color(0xFFE91E63);
      case 'Wallet':
        return const Color(0xFF9C27B0);
      default:
        return SafeJetColors.secondaryHighlight;
    }
  }
} 