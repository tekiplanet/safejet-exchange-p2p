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
import 'package:intl/intl.dart';
import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';

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
    _loadUserIdAndFetchOrderDetails();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadUserIdAndFetchOrderDetails() async {
    try {
      // Get the user ID from the stored user object
      final storage = const FlutterSecureStorage();
      final userJson = await storage.read(key: 'user');
      
      if (userJson != null) {
        final userData = json.decode(userJson);
        final userId = userData['id'];
        
        print('Loaded user ID from storage: $userId');
        
        // Set the user ID
        setState(() {
          _userId = userId;
        });
      } else {
        print('No user data found in storage');
      }
      
      // Then fetch order details
      await _fetchOrderDetails();
    } catch (e) {
      print('Error loading user ID: $e');
      // Still try to fetch order details even if user ID loading fails
      _fetchOrderDetails();
    }
  }

  Future<void> _fetchOrderDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final p2pService = P2PService();
      final orderDetails = await p2pService.getOrderDetails(widget.trackingId);
      
      print('Order details received: $orderDetails');
      
      // Get the payment method ID from the metadata
      final paymentMetadata = orderDetails['paymentMetadata'] ?? {};
      final methodId = paymentMetadata['methodId'];
      
      // Fetch the complete payment method details if methodId is available
      if (methodId != null) {
        try {
          final paymentMethodDetails = await p2pService.getPaymentMethodDetails(methodId);
          print('Payment method details: $paymentMethodDetails');
          
          // Merge the payment method details with the order details
          orderDetails['completePaymentDetails'] = paymentMethodDetails;
        } catch (e) {
          print('Error fetching payment method details: $e');
          // Continue even if payment details fetch fails
        }
      }
      
      setState(() {
        _orderDetails = orderDetails;
        _remainingMinutes = orderDetails['timeRemaining']['minutes'] ?? 15;
        _remainingSeconds = orderDetails['timeRemaining']['seconds'] ?? 0;
        _isLoading = false;
      });
      
      // Start timer to update countdown
      _startTimer();
    } catch (e) {
      print('Error in _fetchOrderDetails: $e');
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

                  // Buyer Information (new section)
                  if (_isCurrentUserSeller() && _orderDetails?['buyer'] != null)
                    FadeInDown(
                      duration: const Duration(milliseconds: 400),
                      delay: const Duration(milliseconds: 300),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: SafeJetColors.success.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.person_outline, color: SafeJetColors.success, size: 16),
                                const SizedBox(width: 8),
                                Text(
                                  'Buyer Information',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: SafeJetColors.success,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            _buildPaymentDetailRow(
                              'Buyer Name',
                              _orderDetails?['buyer']?['fullName'] ?? 'Unknown',
                              isDark,
                            ),
                            if (_orderDetails?['buyer']?['email'] != null)
                              _buildPaymentDetailRow(
                                'Email',
                                _orderDetails!['buyer']['email'],
                                isDark,
                              ),
                            const SizedBox(height: 8),
                            Text(
                              'The buyer will send payment using the details you provided.',
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? Colors.grey[300] : Colors.grey[700],
                              ),
                            ),
                          ],
                        ),
                      ),
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
    
    // Format the numbers properly
    final assetAmount = _orderDetails?['assetAmount'];
    final price = _orderDetails?['offer']?['price'];
    final currencyAmount = _orderDetails?['currencyAmount'];
    
    // Format asset amount (crypto) - up to 8 decimal places, no trailing zeros
    final formattedAssetAmount = assetAmount != null 
        ? _formatCryptoAmount(double.tryParse(assetAmount.toString()) ?? 0)
        : '';
    
    // Format price - with thousand separators
    final formattedPrice = price != null 
        ? _formatFiatAmount(double.tryParse(price.toString()) ?? 0)
        : '';
    
    // Format total amount - with thousand separators
    final formattedTotal = currencyAmount != null 
        ? _formatFiatAmount(double.tryParse(currencyAmount.toString()) ?? 0)
        : '';
    
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
          _buildDetailRow('Amount:', '$formattedAssetAmount $tokenSymbol', isDark),
          _buildDetailRow('Price:', '$currency$formattedPrice/$tokenSymbol', isDark),
          _buildDetailRow('Total:', '$currency$formattedTotal', isDark),
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
    
    // Get the payment data from the order details
    final paymentMetadata = _orderDetails?['paymentMetadata'] ?? {};
    
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
          
          // Use the payment metadata we have
          _buildPaymentDetails(paymentMetadata, isDark),
          
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
                    _isCurrentUserSeller()
                      ? 'The buyer must complete the payment within the time limit'
                      : 'Please make sure to complete the payment within the time limit',
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

  Widget _buildPaymentDetails(dynamic paymentData, bool isDark) {
    // Add debug prints to understand the issue
    // print('Current user ID: $_userId');
    // print('Seller ID from order: ${_orderDetails?['sellerId']}');
    // print('Buyer ID from order: ${_orderDetails?['buyerId']}');
    // print('Is current user the seller? ${_userId == _orderDetails?['sellerId']}');
    // print('Full order details: $_orderDetails');
    
    if (paymentData == null || (paymentData is Map && paymentData.isEmpty)) {
      return const Text('No payment details available');
    }
    
    // If paymentData is a string, try to parse it as JSON
    Map<String, dynamic> paymentMap;
    if (paymentData is String) {
      try {
        paymentMap = json.decode(paymentData);
      } catch (e) {
        print('Error parsing payment data: $e');
        return Text('Invalid payment data: $paymentData');
      }
    } else if (paymentData is Map) {
      paymentMap = Map<String, dynamic>.from(paymentData);
    } else {
      return Text('Unsupported payment data type: ${paymentData.runtimeType}');
    }
    
    // Check if we have completePaymentDetails from the API
    final completeDetails = _orderDetails?['completePaymentDetails'];
    
    // Check if this is a sell order (we are the seller)
    final isSeller = _userId == _orderDetails?['sellerId'];
    
    // For sell orders, the payment metadata might contain the complete payment details
    if (paymentMap.containsKey('details') || paymentMap.containsKey('paymentMethodType')) {
      // This is a complete payment method object (usually for sell orders)
      final paymentMethodType = paymentMap['paymentMethodType'] ?? {};
      final String typeName = paymentMethodType['name'] ?? 'Payment Method';
      final String typeIcon = paymentMethodType['icon'] ?? 'payment';
      final String accountOwner = paymentMap['name'] ?? '';
      
      // Extract the details field which contains the actual payment information
      final details = paymentMap['details'] ?? {};
      
    return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
      children: [
          // Payment method type header
          Row(
            children: [
              Icon(_getIconForPaymentType(typeIcon), size: 20),
              const SizedBox(width: 8),
              Text(
                typeName,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Account owner
          if (accountOwner.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Row(
                children: [
                  const Icon(Icons.person_outline, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    'Account Owner: $accountOwner',
                    style: TextStyle(
                      color: isDark ? Colors.grey[300] : Colors.grey[700],
                    ),
                  ),
                ],
              ),
            ),
          
          // Display each payment field based on its type
          if (details is Map && details.isNotEmpty)
            ...details.entries.map<Widget>((entry) {
              final fieldName = entry.key;
              final fieldData = entry.value is Map ? entry.value as Map<String, dynamic> : {'value': entry.value, 'fieldType': 'text'};
              final fieldType = fieldData['fieldType'] as String? ?? 'text';
              final fieldValue = fieldData['value'];
              
              return _buildPaymentField(
                fieldName: fieldName,
                fieldLabel: _toTitleCase(fieldName),
                fieldType: fieldType,
                fieldValue: fieldValue,
                isDark: isDark,
              );
            }).toList(),
            
          // Add a message based on whether user is buyer or seller
          Container(
            margin: const EdgeInsets.only(top: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: SafeJetColors.info.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.info_outline, color: SafeJetColors.info, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      _isCurrentUserSeller() ? 'Payment Status' : 'Payment Instructions',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: SafeJetColors.info,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _isCurrentUserSeller()
                    ? 'The buyer will send payment to your account. You will be notified when payment is made.'
                    : 'Please make the payment using the details above and click "I have paid" when done.',
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () {
                    // Navigate to chat screen with the correct parameters
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => P2PChatScreen(
                          orderId: _orderDetails?['trackingId'] ?? '',
                          userName: _isCurrentUserSeller() 
                            ? _orderDetails?['buyer']?['fullName'] ?? 'Buyer'
                            : _orderDetails?['seller']?['fullName'] ?? 'Seller',
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.chat_outlined, size: 16),
                  label: const Text('Open Chat'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: SafeJetColors.info,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    minimumSize: const Size(120, 36),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    } else if (completeDetails != null) {
      // Use the complete payment details from the API (usually for buy orders)
      final paymentMethodType = completeDetails['paymentMethodType'] ?? {};
      final String typeName = paymentMethodType['name'] ?? 'Payment Method';
      final String typeIcon = paymentMethodType['icon'] ?? 'payment';
      final String accountOwner = completeDetails['name'] ?? '';
      
      // Extract the details field which contains the actual payment information
      final details = completeDetails['details'] ?? {};
      
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Payment method type header
          Row(
            children: [
              Icon(_getIconForPaymentType(typeIcon), size: 20),
              const SizedBox(width: 8),
              Text(
                typeName,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Account owner
          if (accountOwner.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Row(
                children: [
                  const Icon(Icons.person_outline, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    'Account Owner: $accountOwner',
                    style: TextStyle(
                      color: isDark ? Colors.grey[300] : Colors.grey[700],
                    ),
                  ),
                ],
              ),
            ),
          
          // Display each payment field based on its type
          if (details is Map && details.isNotEmpty)
            ...details.entries.map<Widget>((entry) {
              final fieldName = entry.key;
              final fieldData = entry.value is Map ? entry.value as Map<String, dynamic> : {'value': entry.value, 'fieldType': 'text'};
              final fieldType = fieldData['fieldType'] as String? ?? 'text';
              final fieldValue = fieldData['value'];
              
              return _buildPaymentField(
                fieldName: fieldName,
                fieldLabel: _toTitleCase(fieldName),
                fieldType: fieldType,
                fieldValue: fieldValue,
                isDark: isDark,
              );
            }).toList(),
            
          // Add a message for the buyer
          Container(
            margin: const EdgeInsets.only(top: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: SafeJetColors.info.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.info_outline, color: SafeJetColors.info, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      'Payment Instructions',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: SafeJetColors.info,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _isCurrentUserSeller()
                    ? 'The buyer will send payment to your account. You will be notified when payment is made.'
                    : 'Please make the payment using the details above and click "I have paid" when done.',
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () {
                    // Navigate to chat screen with the correct parameters
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => P2PChatScreen(
                          orderId: _orderDetails?['trackingId'] ?? '',
                          userName: _isCurrentUserSeller() 
                            ? _orderDetails?['buyer']?['fullName'] ?? 'Buyer'
                            : _orderDetails?['seller']?['fullName'] ?? 'Seller',
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.chat_outlined, size: 16),
                  label: const Text('Open Chat'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: SafeJetColors.info,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    minimumSize: const Size(120, 36),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    } else {
      // Use the basic payment metadata (fallback)
      final String typeName = paymentMap['typeName'] ?? 'Payment Method';
      final String typeIcon = paymentMap['icon'] ?? 'payment';
      final String methodName = paymentMap['methodName'] ?? '';
      
      // For bank transfers, we need to display bank details
      final bool isBankTransfer = typeName.toLowerCase().contains('bank');
      
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Payment method type header
          Row(
            children: [
              Icon(_getIconForPaymentType(typeIcon), size: 20),
              const SizedBox(width: 8),
              Text(
                typeName,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Account owner
          if (methodName.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Row(
                children: [
                  const Icon(Icons.person_outline, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    'Account Owner: $methodName',
                    style: TextStyle(
                      color: isDark ? Colors.grey[300] : Colors.grey[700],
                    ),
                  ),
                ],
              ),
            ),
          
          // For bank transfers, show a message to contact the seller
          if (isBankTransfer)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SafeJetColors.info.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, color: SafeJetColors.info, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        _isCurrentUserSeller() ? 'Payment Status' : 'Bank Account Details',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: SafeJetColors.info,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _isCurrentUserSeller()
                      ? 'The buyer will send payment to your account. You will be notified when payment is made.'
                      : 'Please contact the seller through chat to get the bank account details for payment.',
                    style: const TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: () {
                      // Navigate to chat screen with the correct parameters
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => P2PChatScreen(
                            orderId: _orderDetails?['trackingId'] ?? '',
                            userName: _isCurrentUserSeller()
                              ? _orderDetails?['buyer']?['fullName'] ?? 'Buyer'
                              : _orderDetails?['seller']?['fullName'] ?? 'Seller',
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.chat_outlined, size: 16),
                    label: const Text('Open Chat'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: SafeJetColors.info,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      minimumSize: const Size(120, 36),
                    ),
                  ),
                ],
              ),
            ),
          
          // Display other payment method details if available
          ...paymentMap.entries
              .where((e) => !['paymentMethodType', 'name', 'methodName', 'icon', 'typeName', 'typeId', 'methodId', 'description'].contains(e.key))
              .map<Widget>((entry) => _buildDetailRow(_toTitleCase(entry.key), entry.value.toString(), isDark))
              .toList(),
        ],
      );
    }
  }

  Widget _buildPaymentField({
    required String fieldName,
    required String fieldLabel,
    required String fieldType,
    required dynamic fieldValue,
    required bool isDark,
  }) {
    switch (fieldType) {
      case 'image':
        return _buildImageField(fieldLabel, fieldValue.toString(), isDark);
      case 'date':
        return _buildPaymentDetailRow(fieldLabel, fieldValue.toString(), isDark);
      case 'email':
        return _buildPaymentDetailRow(fieldLabel, fieldValue.toString(), isDark);
      case 'phone':
        return _buildPaymentDetailRow(fieldLabel, fieldValue.toString(), isDark);
      case 'select':
        return _buildPaymentDetailRow(fieldLabel, fieldValue.toString(), isDark);
      case 'text':
      default:
        return _buildPaymentDetailRow(fieldLabel, fieldValue.toString(), isDark);
    }
  }

  Widget _buildImageField(String label, String imageValue, bool isDark) {
    // Get the base URL from environment variables
    final baseUrl = dotenv.get('API_URL', fallback: 'http://ctradesglobal.com');
    
    // Based on our testing, the working URL format is:
    final String imageUrl = imageValue.startsWith('http') 
        ? imageValue 
        : '$baseUrl/uploads/payment-methods/$imageValue';
    
    // Only log once during development
    // print('Loading image from: $imageUrl');
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDark
                  ? Colors.grey[400]
                  : SafeJetColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            height: 200,
            decoration: BoxDecoration(
              color: isDark ? Colors.grey[800] : Colors.grey[200],
              borderRadius: BorderRadius.circular(8),
            ),
            child: imageValue.isNotEmpty
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    // Use a cached network image or add a key to prevent rebuilding
                    child: RepaintBoundary(
                      child: Image.network(
                        imageUrl,
                        fit: BoxFit.contain,
                        // Add a key based on the URL to prevent unnecessary reloading
                        key: ValueKey(imageUrl),
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return Center(
                            child: CircularProgressIndicator(
                              value: loadingProgress.expectedTotalBytes != null
                                  ? loadingProgress.cumulativeBytesLoaded /
                                      loadingProgress.expectedTotalBytes!
                                  : null,
                            ),
                          );
                        },
                        errorBuilder: (context, error, stackTrace) {
                          // Only log errors once
                          // print('Error loading image: $error');
                          return Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.error_outline, color: SafeJetColors.error),
                                const SizedBox(height: 8),
                                Text(
                                  'Failed to load image',
                                  style: TextStyle(color: SafeJetColors.error),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  imageValue,
                                  style: TextStyle(
                                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                                    fontSize: 12,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  )
                : const Center(child: Text('No image available')),
          ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }

  // New method specifically for payment details that handles long text
  Widget _buildPaymentDetailRow(String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDark
                  ? Colors.grey[400]
                  : SafeJetColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 4),
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
            child: Container(
              width: double.infinity,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      value,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                      ),
                      softWrap: true,
                      overflow: TextOverflow.visible,
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
          ),
        ],
      ),
    );
  }

  // Helper method to convert snake_case or camelCase to Title Case
  String _toTitleCase(String text) {
    if (text.isEmpty) return '';
    
    // Replace underscores and camelCase with spaces
    final spacedText = text
        .replaceAllMapped(RegExp(r'([a-z])([A-Z])'), (match) => '${match[1]} ${match[2]}')
        .replaceAll('_', ' ');
    
    // Capitalize first letter of each word
    return spacedText.split(' ').map((word) {
      if (word.isEmpty) return '';
      return word[0].toUpperCase() + word.substring(1);
    }).join(' ');
  }

  // Helper method to get icon for payment type
  IconData _getIconForPaymentType(String iconName) {
    switch (iconName) {
      case 'bank':
        return Icons.account_balance_outlined;
      case 'qr_code':
        return Icons.qr_code;
      case 'mobile':
        return Icons.phone_android_outlined;
      case 'payment':
        return Icons.payment_outlined;
      default:
        return Icons.payment_outlined;
    }
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

  // Helper method to format crypto amounts (up to 8 decimal places, no trailing zeros)
  String _formatCryptoAmount(double amount) {
    if (amount == 0) return '0';
    
    // Format with up to 8 decimal places
    String formatted = amount.toStringAsFixed(8);
    
    // Remove trailing zeros
    while (formatted.endsWith('0')) {
      formatted = formatted.substring(0, formatted.length - 1);
    }
    
    // Remove decimal point if it's the last character
    if (formatted.endsWith('.')) {
      formatted = formatted.substring(0, formatted.length - 1);
    }
    
    return formatted;
  }

  // Helper method to format fiat amounts (with thousand separators, 2 decimal places)
  String _formatFiatAmount(double amount) {
    // Use NumberFormat for proper thousand separators
    final formatter = NumberFormat('#,##0.00', 'en_US');
    return formatter.format(amount);
  }

  // Helper method to determine if current user is the seller
  bool _isCurrentUserSeller() {
    // First check if we have the user ID
    if (_userId != null && _orderDetails != null) {
      return _userId == _orderDetails!['sellerId'];
    }
    
    // Fallback: Check if the payment metadata's userId matches the seller ID
    final paymentMetadata = _orderDetails?['paymentMetadata'];
    if (paymentMetadata != null && _orderDetails != null) {
      final metadataUserId = paymentMetadata['userId'];
      return metadataUserId == _orderDetails!['sellerId'];
    }
    
    // Default to false if we can't determine
    return false;
  }
} 