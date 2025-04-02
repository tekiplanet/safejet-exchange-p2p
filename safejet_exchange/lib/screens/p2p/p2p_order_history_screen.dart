import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
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
  final TextEditingController _searchController = TextEditingController();
  
  final List<String> _statusFilters = ['All', 'Pending', 'Completed', 'Cancelled', 'Disputed'];

  // Dummy data for now
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
    },
    // Add more dummy orders...
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      backgroundColor: isDark ? SafeJetColors.primaryBackground : Colors.white,
      appBar: P2PAppBar(
        title: 'Order History',
        onNotificationTap: () {
          // Handle notification tap
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
          tooltip: 'Dispute History',
        ),
      ),
      body: Column(
        children: [
          // Buy/Sell Tabs
          FadeInDown(
            duration: const Duration(milliseconds: 400),
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: SafeJetColors.secondaryHighlight,
                  borderRadius: BorderRadius.circular(8),
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                indicatorPadding: EdgeInsets.zero,
                dividerColor: Colors.transparent,
                labelColor: Colors.black,
                unselectedLabelColor: isDark ? Colors.white : Colors.black,
                labelStyle: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
                unselectedLabelStyle: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.normal,
                ),
                tabs: const [
                  Tab(
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Text('BUY'),
                    ),
                  ),
                  Tab(
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Text('SELL'),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Search Bar
          FadeInDown(
            duration: const Duration(milliseconds: 400),
            delay: const Duration(milliseconds: 100),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: TextField(
                controller: _searchController,
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                ),
                decoration: InputDecoration(
                  hintText: 'Search by Order ID or Counterparty',
                  hintStyle: TextStyle(
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                  prefixIcon: Icon(
                    Icons.search,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                  filled: true,
                  fillColor: isDark 
                      ? Colors.white.withOpacity(0.05) 
                      : Colors.grey[100],
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                ),
                onChanged: (value) {
                  // Implement search functionality
                  setState(() {});
                },
              ),
            ),
          ),

          // Status Filters
          FadeInDown(
            duration: const Duration(milliseconds: 400),
            delay: const Duration(milliseconds: 200),
            child: _buildStatusFilters(isDark),
          ),

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
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => setState(() => _selectedStatus = status),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: isSelected 
                        ? SafeJetColors.secondaryHighlight 
                        : (isDark ? Colors.white.withOpacity(0.05) : Colors.grey[100]),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    status,
                    style: TextStyle(
                      color: isSelected 
                          ? Colors.black 
                          : (isDark ? Colors.white : Colors.black),
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildOrdersList(bool isDark, {required bool isBuy}) {
    if (_orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history,
              size: 64,
              color: isDark ? Colors.grey[700] : Colors.grey[300],
            ),
            const SizedBox(height: 16),
            Text(
              'No orders found',
              style: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _orders.length,
      itemBuilder: (context, index) {
        return FadeInUp(
          duration: const Duration(milliseconds: 400),
          delay: Duration(milliseconds: index * 100),
          child: _buildOrderCard(_orders[index], isDark),
        );
      },
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark 
              ? Colors.white.withOpacity(0.1) 
              : Colors.grey[200]!,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => P2POrderConfirmationScreen(
                trackingId: order['id'],
              ),
            ),
          ),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: order['type'] == 'BUY'
                                ? SafeJetColors.success.withOpacity(0.1)
                                : SafeJetColors.error.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            order['type'],
                            style: TextStyle(
                              color: order['type'] == 'BUY'
                                  ? SafeJetColors.success
                                  : SafeJetColors.error,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '#${order['id']}',
                          style: TextStyle(
                            color: isDark ? Colors.white : Colors.black,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    _buildStatusTag(order['status'], isDark),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildInfoColumn(
                      'Amount',
                      '${order['amount']} ${order['crypto']}',
                      isDark,
                    ),
                    _buildInfoColumn(
                      'Price',
                      '₦${order['price']}',
                      isDark,
                      crossAxisAlignment: CrossAxisAlignment.end,
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
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    if (order['status'] == 'Pending')
                      Row(
                        children: [
                          TextButton.icon(
                            onPressed: () => _openChat(order),
                            icon: const Icon(Icons.chat_outlined, size: 18),
                            label: const Text('Chat'),
                            style: TextButton.styleFrom(
                              foregroundColor: isDark ? Colors.white : Colors.black,
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () => _cancelOrder(order),
                            icon: const Icon(Icons.close, size: 18),
                            label: const Text('Cancel'),
                            style: TextButton.styleFrom(
                              foregroundColor: SafeJetColors.error,
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                            ),
                          ),
                        ],
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

  Widget _buildInfoColumn(
    String label,
    String value,
    bool isDark, {
    CrossAxisAlignment crossAxisAlignment = CrossAxisAlignment.start,
  }) {
    return Column(
      crossAxisAlignment: crossAxisAlignment,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isDark ? Colors.grey[400] : Colors.grey[600],
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: isDark ? Colors.white : Colors.black,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildStatusTag(String status, bool isDark) {
    Color color;
    switch (status.toLowerCase()) {
      case 'pending':
        color = SafeJetColors.warning;
        break;
      case 'completed':
        color = SafeJetColors.success;
        break;
      case 'cancelled':
        color = isDark ? Colors.grey : Colors.grey[600]!;
        break;
      case 'disputed':
        color = SafeJetColors.error;
        break;
      default:
        color = SafeJetColors.warning;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
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

  void _cancelOrder(Map<String, dynamic> order) {
    // Implement cancel order
  }

  void _openChat(Map<String, dynamic> order) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => P2PChatScreen(
          orderId: order['id'],
          userName: order['counterparty'],
        ),
      ),
    );
  }
} 