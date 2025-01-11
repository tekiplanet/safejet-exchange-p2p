import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import '../../providers/payment_methods_provider.dart';
import '../../models/payment_method.dart';
import '../../widgets/payment_method_dialog.dart';
import 'package:animate_do/animate_do.dart';

class P2PPaymentMethodsScreen extends StatefulWidget {
  const P2PPaymentMethodsScreen({super.key});

  @override
  State<P2PPaymentMethodsScreen> createState() => _P2PPaymentMethodsScreenState();
}

class _P2PPaymentMethodsScreenState extends State<P2PPaymentMethodsScreen> {
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<PaymentMethodsProvider>();
      provider.setContext(context);
      provider.loadPaymentMethods();
    });
  }

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
      body: Consumer<PaymentMethodsProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    provider.error!,
                    style: TextStyle(color: SafeJetColors.error),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => provider.loadPaymentMethods(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (provider.paymentMethods.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.payment_outlined,
                    size: 64,
                    color: isDark ? Colors.grey[600] : Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No payment methods added yet',
                    style: TextStyle(
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => _showAddPaymentMethodDialog(isDark),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: SafeJetColors.secondaryHighlight,
                      foregroundColor: Colors.black,
                    ),
                    child: const Text('Add Payment Method'),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.paymentMethods.length,
            itemBuilder: (context, index) {
              final method = provider.paymentMethods[index];
              return FadeInUp(
                duration: const Duration(milliseconds: 300),
                delay: Duration(milliseconds: index * 100),
                child: SlideInLeft(
                  duration: const Duration(milliseconds: 300),
                  delay: Duration(milliseconds: index * 100),
                  child: _buildPaymentMethodCard(method, isDark),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddPaymentMethodDialog(isDark),
        backgroundColor: SafeJetColors.secondaryHighlight,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildPaymentMethodCard(PaymentMethod method, bool isDark) {
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
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.05)
                            : Colors.black.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        _getIconData(method.icon),
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            method.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              if (method.isDefault) ...[
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
                              if (method.isVerified)
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
                if (method.details.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 8),
                  ..._buildMethodDetails(method, isDark),
                ],
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildMethodDetails(PaymentMethod method, bool isDark) {
    return (method.details as Map<String, dynamic>).entries.map((entry) {
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

  void _showAddPaymentMethodDialog(bool isDark) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (context) => PaymentMethodDialog(isDark: isDark),
    );

    if (result != null && mounted) {
      try {
        setState(() => _isLoading = true);
        await context.read<PaymentMethodsProvider>().createPaymentMethod(result);
        
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 8),
                Text('Payment method added successfully'),
              ],
            ),
            backgroundColor: SafeJetColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(child: Text(e.toString())),
              ],
            ),
            backgroundColor: SafeJetColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } finally {
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
    }
  }

  void _showEditPaymentMethodDialog(PaymentMethod method, bool isDark) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => PaymentMethodDialog(
        isDark: isDark,
        method: method,
      ),
    );

    if (result != null && mounted) {
      try {
        await context
            .read<PaymentMethodsProvider>()
            .updatePaymentMethod(method.id, result);
        
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment method updated successfully'),
            backgroundColor: SafeJetColors.success,
          ),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: SafeJetColors.error,
          ),
        );
      }
    }
  }

  void _showDeleteConfirmation(PaymentMethod method) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Payment Method'),
        content: Text(
          'Are you sure you want to delete ${method.name}? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              try {
                Navigator.pop(context);
                await context
                    .read<PaymentMethodsProvider>()
                    .deletePaymentMethod(method.id);
                
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Payment method deleted'),
                    backgroundColor: SafeJetColors.success,
                  ),
                );
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(e.toString()),
                    backgroundColor: SafeJetColors.error,
                  ),
                );
              }
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

  IconData _getIconData(String iconString) {
    switch (iconString) {
      case 'account_balance':
        return Icons.account_balance;
      case 'payment':
        return Icons.payment;
      case 'attach_money':
        return Icons.attach_money;
      case 'mobile_friendly':
        return Icons.mobile_friendly;
      case 'currency_exchange':
        return Icons.currency_exchange;
      default:
        return Icons.account_balance; // default icon
    }
  }
} 