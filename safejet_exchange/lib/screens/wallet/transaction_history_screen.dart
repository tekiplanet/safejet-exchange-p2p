import 'package:flutter/material.dart';
import '../../config/theme/colors.dart';
import 'package:animate_do/animate_do.dart';
import '../../widgets/custom_app_bar.dart';
import 'package:provider/provider.dart';
import '../../config/theme/theme_provider.dart';

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  State<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  String _selectedFilter = 'All';
  final List<String> _filters = ['All', 'Deposits', 'Withdrawals', 'Trades'];

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
            child: Column(
              children: [
                // Filter Tabs
                FadeInDown(
                  duration: const Duration(milliseconds: 600),
                  child: Container(
                    height: 40,
                    margin: const EdgeInsets.all(16),
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _filters.length,
                      itemBuilder: (context, index) {
                        final isSelected = _filters[index] == _selectedFilter;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedFilter = _filters[index]),
                          child: Container(
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? SafeJetColors.secondaryHighlight
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isSelected
                                    ? SafeJetColors.secondaryHighlight
                                    : (isDark
                                        ? SafeJetColors.primaryAccent.withOpacity(0.2)
                                        : SafeJetColors.lightCardBorder),
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              _filters[index],
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.black
                                    : (isDark ? Colors.white : SafeJetColors.lightText),
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),

                // Transactions List
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: 20,
                    itemBuilder: (context, index) => FadeInDown(
                      duration: const Duration(milliseconds: 600),
                      delay: Duration(milliseconds: 100 * index),
                      child: _buildTransactionItem(index, isDark, theme),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTransactionItem(int index, bool isDark, ThemeData theme) {
    final isDeposit = index % 3 == 0;
    final isWithdraw = index % 3 == 1;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
          // Transaction Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _getTransactionColor(isDeposit, isWithdraw).withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _getTransactionIcon(isDeposit, isWithdraw),
              color: _getTransactionColor(isDeposit, isWithdraw),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          
          // Transaction Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getTransactionType(isDeposit, isWithdraw),
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '2024-02-${10 + index}  14:${30 + index}',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          
          // Amount and Status
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _getTransactionAmount(isDeposit, isWithdraw, index),
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: _getTransactionColor(isDeposit, isWithdraw),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: _getStatusColor(index).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _getTransactionStatus(index),
                  style: TextStyle(
                    color: _getStatusColor(index),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getTransactionIcon(bool isDeposit, bool isWithdraw) {
    if (isDeposit) return Icons.arrow_downward_rounded;
    if (isWithdraw) return Icons.arrow_upward_rounded;
    return Icons.sync_alt_rounded;
  }

  Color _getTransactionColor(bool isDeposit, bool isWithdraw) {
    if (isDeposit) return SafeJetColors.success;
    if (isWithdraw) return SafeJetColors.error;
    return Colors.blue;
  }

  String _getTransactionType(bool isDeposit, bool isWithdraw) {
    if (isDeposit) return 'Deposit BTC';
    if (isWithdraw) return 'Withdraw BTC';
    return 'Trade BTC';
  }

  String _getTransactionAmount(bool isDeposit, bool isWithdraw, int index) {
    if (isDeposit) return '+0.0${index + 1} BTC';
    if (isWithdraw) return '-0.0${index + 1} BTC';
    return '0.0${index + 1} BTC';
  }

  Color _getStatusColor(int index) {
    switch (index % 4) {
      case 0:
        return SafeJetColors.success;
      case 1:
        return Colors.orange;
      case 2:
        return SafeJetColors.error;
      default:
        return Colors.blue;
    }
  }

  String _getTransactionStatus(int index) {
    switch (index % 4) {
      case 0:
        return 'Completed';
      case 1:
        return 'Pending';
      case 2:
        return 'Failed';
      default:
        return 'Processing';
    }
  }
} 