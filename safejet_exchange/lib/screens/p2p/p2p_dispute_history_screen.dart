import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../config/theme/colors.dart';
import '../../widgets/p2p_app_bar.dart';
import '../../services/p2p_service.dart';
import '../../widgets/loading_indicator.dart';
import 'p2p_dispute_details_screen.dart';
import 'dart:async';

class P2PDisputeHistoryScreen extends StatefulWidget {
  const P2PDisputeHistoryScreen({super.key});

  @override
  State<P2PDisputeHistoryScreen> createState() => _P2PDisputeHistoryScreenState();
}

class _P2PDisputeHistoryScreenState extends State<P2PDisputeHistoryScreen> {
  final P2PService _p2pService = GetIt.I<P2PService>();
  List<Map<String, dynamic>> _disputes = [];
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadDisputes();
  }

  Future<void> _loadDisputes() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });

    try {
      final disputes = await _p2pService.getUserDisputes();
      setState(() {
        _disputes = disputes;
        _isLoading = false;
      });
      print('Loaded ${disputes.length} disputes');
    } catch (e) {
      print('Error loading disputes: $e');
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = 'Failed to load disputes: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Dispute History',
        hasNotification: false,
      ),
      body: _isLoading
          ? const Center(child: LoadingIndicator())
          : _hasError
              ? _buildErrorView()
              : _disputes.isEmpty
                  ? _buildEmptyView(isDark)
                  : RefreshIndicator(
                      onRefresh: _loadDisputes,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _disputes.length,
                        itemBuilder: (context, index) {
                          final dispute = _disputes[index];
                          final order = dispute['order'] ?? {};
                          final buyer = order['buyer'] ?? {};
                          final seller = order['seller'] ?? {};
                          
                          // Get the counterparty name based on currentUserId
                          String counterpartyName = '';
                          final currentUserId = dispute['userId'];
                          
                          if (currentUserId == buyer['id']) {
                            // Current user is buyer, seller is counterparty
                            counterpartyName = seller['username'] ?? seller['fullName'] ?? 'Seller';
                          } else {
                            // Current user is seller, buyer is counterparty
                            counterpartyName = buyer['username'] ?? buyer['fullName'] ?? 'Buyer';
                          }
                          
                          final status = dispute['status'] ?? 'Pending';
                          final amount = '${order['amount'] ?? '0'} ${order['tokenSymbol'] ?? 'USDT'}';
                          final createdAt = dispute['createdAt'];
                          final formattedDate = _formatDate(createdAt);
                          
                          return _buildDisputeCard(
                            context,
                            isDark,
                            orderId: order['trackingId'] ?? dispute['id'] ?? 'Unknown',
                            status: _formatStatus(status),
                            date: formattedDate,
                            amount: amount,
                            counterparty: counterpartyName,
                          );
                        },
                      ),
                    ),
    );
  }
  
  String _formatStatus(String status) {
    // Convert from backend status to user-friendly status
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Pending';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'RESOLVED_BUYER':
        return 'Resolved (Buyer)';
      case 'RESOLVED_SELLER':
        return 'Resolved (Seller)';
      case 'CLOSED':
        return 'Closed';
      default:
        return status;
    }
  }
  
  String _formatDate(String? dateString) {
    if (dateString == null) return 'Unknown date';
    try {
      return _p2pService.formatDate(dateString);
    } catch (e) {
      return dateString;
    }
  }

  Widget _buildEmptyView(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.question_answer_outlined,
            size: 64,
            color: isDark ? Colors.grey[700] : Colors.grey[300],
          ),
          const SizedBox(height: 16),
          Text(
            'No disputes yet',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white70 : Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'When you have disputes, they will appear here',
            style: TextStyle(
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),
          TextButton.icon(
            onPressed: _loadDisputes,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh'),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red,
          ),
          const SizedBox(height: 16),
          const Text(
            'Failed to load disputes',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _errorMessage,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _loadDisputes,
            icon: const Icon(Icons.refresh),
            label: const Text('Try Again'),
          ),
        ],
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
    final isResolved = status.toLowerCase().contains('resolved') || status.toLowerCase() == 'closed';
    final statusColor = _getStatusColor(status);

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
            ).then((_) => _loadDisputes()); // Refresh after returning
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
                        color: statusColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        status.toUpperCase(),
                        style: TextStyle(
                          color: statusColor,
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
  
  Color _getStatusColor(String status) {
    final statusLower = status.toLowerCase();
    if (statusLower.contains('resolved') || statusLower == 'closed') {
      return SafeJetColors.success;
    } else if (statusLower == 'in progress') {
      return SafeJetColors.blue;
    } else if (statusLower == 'pending') {
      return SafeJetColors.warning;
    } else {
      return SafeJetColors.warning;
    }
  }
} 