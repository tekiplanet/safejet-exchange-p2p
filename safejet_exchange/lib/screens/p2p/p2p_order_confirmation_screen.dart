import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/custom_app_bar.dart';
import 'p2p_chat_screen.dart';
import 'package:flutter/services.dart';
import '../../widgets/p2p_app_bar.dart';
import 'p2p_dispute_screen.dart';
import 'p2p_order_history_screen.dart';
import 'p2p_dispute_history_screen.dart';
import 'p2p_dispute_details_screen.dart';
import '../../services/p2p_service.dart';
import 'dart:async';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Move AnimatedDialog outside the state class
class AnimatedDialog extends StatelessWidget {
  final Widget child;

  const AnimatedDialog({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
      child: FadeInUp(
        duration: const Duration(milliseconds: 300),
        child: child,
      ),
    );
  }
}

// Move CustomPageRoute outside the state class
class CustomPageRoute extends PageRouteBuilder {
  final Widget child;

  CustomPageRoute({required this.child})
      : super(
          transitionDuration: const Duration(milliseconds: 300),
          pageBuilder: (context, animation, secondaryAnimation) => child,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            const begin = Offset(0.0, 0.1);
            const end = Offset.zero;
            const curve = Curves.easeOut;
            var tween = Tween(begin: begin, end: end).chain(
              CurveTween(curve: curve),
            );
            var offsetAnimation = animation.drive(tween);
            return SlideTransition(
              position: offsetAnimation,
              child: FadeTransition(
                opacity: animation,
                child: child,
              ),
            );
          },
        );
}

class P2POrderConfirmationScreen extends StatefulWidget {
  final String trackingId;

  const P2POrderConfirmationScreen({
    super.key,
    required this.trackingId,
  });

  @override
  State<P2POrderConfirmationScreen> createState() => _P2POrderConfirmationScreenState();
}

class _P2POrderConfirmationScreenState extends State<P2POrderConfirmationScreen> {
  bool _isPaymentConfirmed = false;
  bool _isLoading = true;
  Map<String, dynamic>? _orderDetails;
  String _errorMessage = '';
  Timer? _timer;
  int _remainingMinutes = 0;
  int _remainingSeconds = 0;
  String? _userId;

  @override
  void initState() {
    super.initState();
    _fetchOrderDetails();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetchOrderDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      // Create a P2P service instance directly instead of using Provider
      final p2pService = P2PService();
      final orderDetails = await p2pService.getOrderDetails(widget.trackingId);
      
      // Get the user ID from secure storage
      final storage = const FlutterSecureStorage();
      final userId = await storage.read(key: 'userId');
      
      setState(() {
        _orderDetails = orderDetails;
        _userId = userId;
        _remainingMinutes = orderDetails['timeRemaining']['minutes'];
        _remainingSeconds = orderDetails['timeRemaining']['seconds'];
        _isLoading = false;
      });
      
      // Start timer to update countdown
      _startTimer();
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load order details: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_remainingSeconds > 0) {
          _remainingSeconds--;
        } else if (_remainingMinutes > 0) {
          _remainingMinutes--;
          _remainingSeconds = 59;
        } else {
          _timer?.cancel();
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Order Confirmation',
        onNotificationTap: () {
          // TODO: Handle notification tap
        },
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              onPressed: () {
                Navigator.push(
                  context,
                  CustomPageRoute(
                    child: P2PChatScreen(
                      userName: _orderDetails?['isBuyer'] ? _orderDetails?['seller']?['fullName'] : _orderDetails?['buyer']?['fullName'] ?? 'Trader',
                      orderId: _orderDetails?['trackingId'] ?? '',
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.chat_outlined),
            ),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              position: PopupMenuPosition.under,
              offset: const Offset(0, 8),
              itemBuilder: (context) => <PopupMenuEntry<String>>[
                PopupMenuItem<String>(
                  value: 'dispute',
                  onTap: () {
                    Future.delayed(const Duration(milliseconds: 10), () {
                      Navigator.push(
                        context,
                        CustomPageRoute(
                          child: P2PDisputeScreen(
                            orderId: _orderDetails?['trackingId'] ?? '',
                            isBuyer: _orderDetails?['buyerId'] == _userId,
                          ),
                        ),
                      );
                    });
                  },
                  child: Tooltip(
                    message: 'Open dispute if you have issues with this order',
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: SafeJetColors.warning.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.warning_rounded,
                              color: SafeJetColors.warning,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Raise Dispute',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  'Report issues with this order',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                PopupMenuItem<String>(
                  value: 'copy',
                  onTap: () {
                    final trackingId = _orderDetails?['trackingId'] ?? '';
                    Clipboard.setData(ClipboardData(text: trackingId));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Order ID copied to clipboard'),
                        backgroundColor: SafeJetColors.success,
                      ),
                    );
                  },
                  child: Tooltip(
                    message: 'Copy order ID to clipboard',
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
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
                              Icons.copy_rounded,
                              color: isDark ? Colors.white : SafeJetColors.lightText,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Copy Order ID',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  '#${_orderDetails?['trackingId'] ?? ''}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                PopupMenuItem<String>(
                  value: 'viewDispute',
                  onTap: () {
                    Future.delayed(const Duration(milliseconds: 10), () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => P2PDisputeDetailsScreen(
                            orderId: 'P2P123456789',
                          ),
                        ),
                      );
                    });
                  },
                  child: Tooltip(
                    message: 'View dispute details for this order',
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: SafeJetColors.warning.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.gavel_rounded,
                              color: SafeJetColors.warning,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'View Dispute',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  'Check dispute status and details',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Order Timer
                  FadeInDown(
                    duration: const Duration(milliseconds: 400),
                    child: _buildTimerSection(isDark),
                  ),
                  const SizedBox(height: 24),

                  // Order Details
                  FadeInDown(
                    duration: const Duration(milliseconds: 400),
                    delay: const Duration(milliseconds: 200),
                    child: _buildOrderDetails(isDark),
                  ),
                  const SizedBox(height: 24),

                  // Payment Instructions
                  FadeInDown(
                    duration: const Duration(milliseconds: 400),
                    delay: const Duration(milliseconds: 400),
                    child: _buildPaymentInstructions(isDark),
                  ),
                ],
              ),
            ),
          ),
          // Bottom Actions
          _buildBottomActions(isDark),
        ],
      ),
    );
  }

  Widget _buildTimerSection(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: SafeJetColors.warning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: SafeJetColors.warning.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.timer_outlined,
            color: SafeJetColors.warning,
            size: 24,
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Time remaining to pay',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                '${_remainingMinutes.toString().padLeft(2, '0')}:${_remainingSeconds.toString().padLeft(2, '0')}',
                style: TextStyle(
                  color: SafeJetColors.warning,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOrderDetails(bool isDark) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (_errorMessage.isNotEmpty) {
      return Center(child: Text(_errorMessage, style: TextStyle(color: SafeJetColors.error)));
    }
    
    final tokenSymbol = _orderDetails?['offer']?['token']?['symbol'] ?? 'USDT';
    final currency = _orderDetails?['offer']?['currency'] ?? '₦';
    final formattedCreatedAt = _orderDetails?['createdAt'] != null 
      ? DateTime.parse(_orderDetails!['createdAt']).toLocal().toString().substring(0, 16)
      : 'Today, 12:30 PM';
    
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
            'Order Details',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          _buildDetailRow('Amount:', '${_orderDetails?['assetAmount'] ?? ''} $tokenSymbol', isDark),
          _buildDetailRow('Price:', '$currency${_orderDetails?['offer']?['price'] ?? ''}/$tokenSymbol', isDark),
          _buildDetailRow('Total:', '$currency${_orderDetails?['currencyAmount'] ?? ''}', isDark),
          _buildDetailRow('Order Number:', '#${_orderDetails?['trackingId'] ?? ''}', isDark),
          _buildDetailRow('Created:', formattedCreatedAt, isDark),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDark
                  ? Colors.grey[400]
                  : SafeJetColors.lightTextSecondary,
            ),
          ),
          InkWell(
            onTap: () {
              Clipboard.setData(ClipboardData(text: value));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('$label copied to clipboard'),
                  backgroundColor: SafeJetColors.success,
                  duration: const Duration(seconds: 1),
                ),
              );
            },
            child: Row(
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.copy_rounded,
                  size: 16,
                  color: isDark
                      ? Colors.grey[400]
                      : SafeJetColors.lightTextSecondary,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentInstructions(bool isDark) {
    if (_isLoading || _orderDetails == null) {
      return const Center(child: CircularProgressIndicator());
    }
    
    final paymentDetails = _orderDetails?['paymentMetadata'] ?? {};
    
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
            'Payment Instructions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          _buildPaymentDetails(paymentDetails, isDark),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: SafeJetColors.warning.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  color: SafeJetColors.warning,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Please make sure to complete the payment within the time limit',
                    style: TextStyle(
                      color: SafeJetColors.warning,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentDetails(Map<String, dynamic> paymentDetails, bool isDark) {
    final List<Widget> details = [];
    
    paymentDetails.forEach((key, value) {
      if (value != null && value.toString().isNotEmpty) {
        details.add(_buildDetailRow(key, value.toString(), isDark));
      }
    });
    
    if (details.isEmpty) {
      return const Text('No payment details available');
    }
    
    return Column(children: details);
  }

  Widget _buildBottomActions(bool isDark) {
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
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => AnimatedDialog(
                    child: AlertDialog(
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
                            Navigator.pop(context); // Close dialog
                            Navigator.pop(context); // Go back to previous screen
                          },
                          style: TextButton.styleFrom(
                            foregroundColor: SafeJetColors.warning,
                          ),
                          child: const Text('Yes, Cancel'),
                        ),
                      ],
                    ),
                  ),
                );
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: BorderSide(
                  color: isDark
                      ? SafeJetColors.primaryAccent.withOpacity(0.2)
                      : SafeJetColors.lightCardBorder,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Cancel Order'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: _handlePaymentConfirmation,
              style: ElevatedButton.styleFrom(
                backgroundColor: SafeJetColors.success,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: const Text('I have paid'),
            ),
          ),
        ],
      ),
    );
  }

  void _handlePaymentConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AnimatedDialog(
        child: AlertDialog(
          title: const Text('Confirm Payment'),
          content: const Text(
            'By confirming, you declare that you have completed the payment. False confirmation may result in account restrictions.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context); // Close dialog
                setState(() => _isPaymentConfirmed = true);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Payment confirmed successfully'),
                    backgroundColor: SafeJetColors.success,
                  ),
                );
              },
              style: TextButton.styleFrom(
                foregroundColor: SafeJetColors.success,
              ),
              child: const Text('Yes, I have paid'),
            ),
          ],
        ),
      ),
    );
  }
} 