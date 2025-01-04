import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import 'p2p_order_confirmation_screen.dart';
import 'p2p_dispute_history_screen.dart';
import 'p2p_chat_screen.dart';

class P2POrderHistoryScreen extends StatefulWidget {
  const P2POrderHistoryScreen({super.key});

  @override
  State<P2POrderHistoryScreen> createState() => _P2POrderHistoryScreenState();
}

class _P2POrderHistoryScreenState extends State<P2POrderHistoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedStatus = 'All';

  final List<String> _statusFilters = ['All', 'Pending', 'Completed', 'Cancelled', 'Disputed'];

  final List<Map<String, dynamic>> _orders = [
    {
      'id': 'P2P123456789',
      'type': 'BUY',
      'amount': '1,234.56',
      'crypto': 'USDT',
      'price': '750.00',
      'total': '925,920.00',
      'status': 'Pending',
      'date': 'Today, 12:30 PM',
      'counterparty': 'JohnSeller',
      'paymentMethod': 'Bank Transfer',
      'timeLeft': '15:00',
      'disputeReason': null,
    },
    // Add more dummy orders...
  ];

  // Add search controller
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Order History',
        onNotificationTap: () {
          // TODO: Handle notification tap
        },
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
        trailing: IconButton(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const P2PDisputeHistoryScreen(),
              ),
            );
          },
          icon: const Icon(Icons.gavel_rounded),
        ),
      ),
      body: Column(
        children: [
          // Buy/Sell Tabs with improved design
          Container(
            margin: const EdgeInsets.all(16),
            height: 48,
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
            child: TabBar(
              controller: _tabController,
              indicator: UnderlineTabIndicator(
                borderSide: BorderSide(
                  color: SafeJetColors.secondaryHighlight,
                  width: 3,
                ),
                insets: const EdgeInsets.symmetric(horizontal: 40),
              ),
              labelColor: isDark ? Colors.white : SafeJetColors.lightText,
              unselectedLabelColor: isDark ? Colors.grey : SafeJetColors.lightTextSecondary,
              labelStyle: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
              unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.normal,
                fontSize: 14,
              ),
              tabs: const [
                Tab(text: 'BUY'),
                Tab(text: 'SELL'),
              ],
            ),
          ),

          // Add search widget between tabs and filters
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by Order ID or Counterparty',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: isDark
                    ? Colors.white.withOpacity(0.05)
                    : Colors.black.withOpacity(0.05),
              ),
              onChanged: (value) {
                setState(() {
                  // Filter orders based on search
                });
              },
            ),
          ),

          // Status Filter with new design
          _buildStatusFilters(isDark),
          const SizedBox(height: 8),

          // Orders List
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildOrdersList(isDark, isBuy: true),
                _buildOrdersList(isDark, isBuy: false),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrdersList(bool isDark, {required bool isBuy}) {
    final groupedOrders = <String, List<Map<String, dynamic>>>{};
    
    for (var order in _orders) {
      final date = order['date'].toString().split(',')[0]; // Get just the day
      if (!groupedOrders.containsKey(date)) {
        groupedOrders[date] = [];
      }
      groupedOrders[date]!.add(order);
    }

    return ListView.builder(
      itemCount: groupedOrders.length,
      itemBuilder: (context, index) {
        final date = groupedOrders.keys.elementAt(index);
        final dateOrders = groupedOrders[date]!;
        
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                date,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                ),
              ),
            ),
            ...dateOrders.map((order) => _buildOrderCard(order, isDark)),
          ],
        );
      },
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order, bool isDark) {
    final isBuy = order['type'] == 'BUY';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => P2POrderConfirmationScreen(
                  isBuy: isBuy,
                  amount: order['amount'],
                  price: order['price'],
                  total: order['total'],
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
                      '#${order['id']}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    _buildStatusTag(order['status'], isDark),
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
                          '${order['amount']} ${order['crypto']}',
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
                          'Total',
                          style: TextStyle(
                            color: isDark
                                ? Colors.grey[400]
                                : SafeJetColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '₦${order['total']}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      order['date'],
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark
                            ? Colors.grey[400]
                            : SafeJetColors.lightTextSecondary,
                      ),
                    ),
                    Text(
                      order['counterparty'],
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark
                            ? Colors.grey[400]
                            : SafeJetColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (order['status'] == 'Pending') ...[
                      TextButton.icon(
                        onPressed: () => _cancelOrder(order),
                        icon: const Icon(Icons.close),
                        label: const Text('Cancel'),
                        style: TextButton.styleFrom(
                          foregroundColor: SafeJetColors.error,
                        ),
                      ),
                      const SizedBox(width: 8),
                      TextButton.icon(
                        onPressed: () => _openChat(order),
                        icon: const Icon(Icons.chat_outlined),
                        label: const Text('Chat'),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusTag(String status, bool isDark) {
    Color color;
    switch (status) {
      case 'Pending':
        color = SafeJetColors.warning;
        break;
      case 'Completed':
        color = SafeJetColors.success;
        break;
      case 'Cancelled':
        color = isDark ? Colors.grey : SafeJetColors.lightTextSecondary;
        break;
      case 'Disputed':
        color = SafeJetColors.error;
        break;
      default:
        color = SafeJetColors.warning;
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 8,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildStatusFilters(bool isDark) {
    return Container(
      height: 40,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _statusFilters.length,
        itemBuilder: (context, index) {
          final status = _statusFilters[index];
          final isSelected = status == _selectedStatus;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              onTap: () => setState(() => _selectedStatus = status),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: isSelected 
                      ? SafeJetColors.secondaryHighlight 
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                ),
                alignment: Alignment.center,
                child: Text(
                  status,
                  style: TextStyle(
                    color: isSelected 
                        ? Colors.black
                        : (isDark ? Colors.white : SafeJetColors.lightText),
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _cancelOrder(Map<String, dynamic> order) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Order'),
        content: const Text(
          'Are you sure you want to cancel this order? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () {
              // TODO: Implement order cancellation
              setState(() {
                order['status'] = 'Cancelled';
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Order cancelled successfully'),
                  backgroundColor: SafeJetColors.success,
                ),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: SafeJetColors.error,
            ),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );
  }

  void _openChat(Map<String, dynamic> order) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => P2PChatScreen(
          userName: order['counterparty'],
          orderId: order['id'],
        ),
      ),
    );
  }
} 