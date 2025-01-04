import 'package:flutter/material.dart';
import '../../config/theme/colors.dart';
import '../../widgets/p2p_app_bar.dart';
import 'p2p_dispute_details_screen.dart';

class P2PDisputeHistoryScreen extends StatelessWidget {
  const P2PDisputeHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Dispute History',
        hasNotification: false,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 5, // Dummy count
        itemBuilder: (context, index) {
          return _buildDisputeCard(
            context,
            isDark,
            orderId: 'P2P123456789',
            status: index % 2 == 0 ? 'In Progress' : 'Resolved',
            date: 'Oct 12, 2023',
            amount: '1,234.56 USDT',
            counterparty: 'JohnSeller',
          );
        },
      ),
    );
  }

  Widget _buildDisputeCard(
    BuildContext context,
    bool isDark, {
    required String orderId,
    required String status,
    required String date,
    required String amount,
    required String counterparty,
  }) {
    final isResolved = status == 'Resolved';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => P2PDisputeDetailsScreen(
                  orderId: orderId,
                ),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '#$orderId',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: isResolved
                            ? SafeJetColors.success.withOpacity(0.2)
                            : SafeJetColors.warning.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        status.toUpperCase(),
                        style: TextStyle(
                          color: isResolved
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
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Amount',
                          style: TextStyle(
                            color: isDark
                                ? Colors.grey[400]
                                : SafeJetColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          amount,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Counterparty',
                          style: TextStyle(
                            color: isDark
                                ? Colors.grey[400]
                                : SafeJetColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          counterparty,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Opened on $date',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark
                        ? Colors.grey[400]
                        : SafeJetColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
} 