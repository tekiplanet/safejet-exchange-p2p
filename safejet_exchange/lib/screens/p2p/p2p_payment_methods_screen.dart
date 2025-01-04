import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';

class P2PPaymentMethodsScreen extends StatefulWidget {
  const P2PPaymentMethodsScreen({super.key});

  @override
  State<P2PPaymentMethodsScreen> createState() => _P2PPaymentMethodsScreenState();
}

class _P2PPaymentMethodsScreenState extends State<P2PPaymentMethodsScreen> {
  final List<Map<String, dynamic>> _paymentMethods = [
    {
      'id': '1',
      'name': 'Bank Transfer',
      'icon': Icons.account_balance,
      'isDefault': true,
      'isVerified': true,
      'details': {
        'bank': 'Access Bank',
        'accountNumber': '1234567890',
        'accountName': 'John Doe',
      },
      'limits': {
        'min': '10000',
        'max': '1000000',
      },
    },
    {
      'id': '2',
      'name': 'PayPal',
      'icon': Icons.payment,
      'isDefault': false,
      'isVerified': true,
      'details': {
        'email': 'john@example.com',
      },
      'limits': {
        'min': '5000',
        'max': '500000',
      },
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Payment Methods',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _paymentMethods.length,
        itemBuilder: (context, index) {
          final method = _paymentMethods[index];
          return _buildPaymentMethodCard(method, isDark);
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddPaymentMethodDialog(isDark),
        backgroundColor: SafeJetColors.secondaryHighlight,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildPaymentMethodCard(Map<String, dynamic> method, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showEditPaymentMethodDialog(method, isDark),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.05)
                            : Colors.black.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        method['icon'] as IconData,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            method['name'],
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              if (method['isDefault']) ...[
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: SafeJetColors.success.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'Default',
                                    style: TextStyle(
                                      color: SafeJetColors.success,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                              if (method['isVerified'])
                                const Icon(
                                  Icons.verified,
                                  color: SafeJetColors.success,
                                  size: 16,
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => _showDeleteConfirmation(method),
                      icon: const Icon(Icons.delete_outline),
                      color: SafeJetColors.error,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 8),
                ..._buildMethodDetails(method, isDark),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 16,
                      color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Limits: ₦${method['limits']['min']} - ₦${method['limits']['max']}',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildMethodDetails(Map<String, dynamic> method, bool isDark) {
    return (method['details'] as Map<String, dynamic>).entries.map((entry) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              entry.key.toUpperCase(),
              style: TextStyle(
                color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                fontSize: 12,
              ),
            ),
            Text(
              entry.value,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    }).toList();
  }

  void _showAddPaymentMethodDialog(bool isDark) {
    // TODO: Implement add payment method dialog
  }

  void _showEditPaymentMethodDialog(Map<String, dynamic> method, bool isDark) {
    // TODO: Implement edit payment method dialog
  }

  void _showDeleteConfirmation(Map<String, dynamic> method) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Payment Method'),
        content: Text(
          'Are you sure you want to delete ${method['name']}? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _paymentMethods.remove(method);
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Payment method deleted'),
                  backgroundColor: SafeJetColors.success,
                ),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: SafeJetColors.error,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
} 