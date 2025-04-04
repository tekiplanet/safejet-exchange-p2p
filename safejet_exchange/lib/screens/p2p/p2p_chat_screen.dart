import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../../services/p2p_service.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import 'package:intl/intl.dart';

class P2PChatScreen extends StatefulWidget {
  final String orderId;
  final String trackingId;
  final bool isBuyer;
  final String userName;

  const P2PChatScreen({
    super.key,
    required this.orderId,
    required this.trackingId,
    required this.isBuyer,
    required this.userName,
  });

  @override
  State<P2PChatScreen> createState() => _P2PChatScreenState();
}

class _P2PChatScreenState extends State<P2PChatScreen> {
  final P2PService _p2pService = GetIt.I<P2PService>();
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  final Set<String> _deliveredMessages = {};
  final Set<String> _readMessages = {};
  bool _isLoading = true;
  Map<String, dynamic>? _orderDetails;
  final _numberFormat = NumberFormat("#,##0.00", "en_US");
  StreamSubscription? _messageSubscription;

  @override
  void initState() {
    super.initState();
    _initializeChat();
    _setupMessageStatusListeners();
  }

  Future<void> _initializeChat() async {
    print('=== INITIALIZING CHAT ===');
    print('OrderID: ${widget.orderId}');
    print('TrackingID: ${widget.trackingId}');
    try {
      await _p2pService.connectToChat();
      print('Connected to chat service');

      _p2pService.joinOrderChat(widget.orderId);
      print('Joined order chat: ${widget.orderId}');
      
      final messages = await _p2pService.getOrderMessages(widget.orderId);
      print('Fetched initial messages: ${messages.length}');

      setState(() {
        _messages = messages;
        _isLoading = false;
      });
      print('Set initial messages in state');

      _messageSubscription?.cancel();
      _messageSubscription = _p2pService.listenToMessages(widget.orderId, (message) {
        print('=== NEW MESSAGE CALLBACK ===');
        print('Current OrderID: ${widget.orderId}');
        print('Current TrackingID: ${widget.trackingId}');
        print('Message received: $message');
        print('=== MESSAGE DETAILS ===');
        print('Current messages count: ${_messages.length}');
        print('Message ID: ${message['id']}');
        print('Sender ID: ${message['senderId']}');
        setState(() {
          if (!_messages.any((m) => m['id'] == message['id'])) {
            _messages.add(message);
            print('Added new message to state');
            print('New messages count: ${_messages.length}');
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _scrollToBottom();
            });
          } else {
            print('Message already exists in state');
            print('Duplicate message ID: ${message['id']}');
          }
        });
      });
      print('Message listener set up');
    } catch (e) {
      print('=== CHAT INITIALIZATION ERROR ===');
      print('Error initializing chat: $e');
      print(StackTrace.current);
    }
  }

  Future<void> _loadOrderDetails() async {
    try {
      // print('Attempting to load order details for trackingId: ${widget.trackingId}');
      // Get order details from the API
      final orderDetails = await _p2pService.getOrderDetails(widget.trackingId);
      if (orderDetails != null) {
        setState(() {
          _orderDetails = orderDetails;
        });
      } else {
        print('Failed to load order details');
      }
    } catch (e) {
      print('Error loading order details: $e');
      // For now, let's create a simple order details object so the UI works
      setState(() {
        _orderDetails = {
          'trackingId': widget.trackingId,
          'status': 'In Progress',
          'amount': 0.0,
          'price': 0.0,
          'total': 0.0,
          'token': {'symbol': 'USDT'},
          'currency': {'symbol': 'NGN'},
        };
      });
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _setupMessageStatusListeners() {
    // Listen for delivery status updates
    _p2pService.listenToDeliveryStatus(widget.orderId, (messageId) {
      setState(() {
        _deliveredMessages.add(messageId);
      });
    });

    // Listen for read status updates
    _p2pService.listenToReadStatus(widget.orderId, (messageId) {
      setState(() {
        _readMessages.add(messageId);
      });
    });
  }

  void _markMessageAsDelivered(String messageId) {
    if (!_deliveredMessages.contains(messageId)) {
      _p2pService.markMessageAsDelivered(messageId);
    }
  }

  void _markMessageAsRead(String messageId) {
    if (!_readMessages.contains(messageId)) {
      _p2pService.markMessageAsRead(messageId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: widget.userName,
        onNotificationTap: () {
          // Handle notification tap
        },
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final message = _messages[index];
                  final messageType = message['messageType']?.toString() ?? '';
                  final isSender = !messageType.contains('SYSTEM') && 
                      (widget.isBuyer 
                          ? messageType == 'BUYER'
                          : messageType == 'SELLER');
                  return _buildMessageItem(message, isSender, isDark);
                },
              ),
          ),
          _buildMessageInput(isDark),
        ],
      ),
    );
  }

  Widget _buildMessageItem(Map<String, dynamic> message, bool isSender, bool isDark) {
    final isSystem = message['messageType'] == 'SYSTEM';

    if (isSystem) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: SafeJetColors.warning.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              Icons.info_outline,
              color: SafeJetColors.warning,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message['message'],
                style: TextStyle(
                  color: SafeJetColors.warning,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: isSender ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isSender) ...[
            CircleAvatar(
              backgroundColor: isDark
                  ? SafeJetColors.primaryAccent.withOpacity(0.2)
                  : SafeJetColors.lightCardBorder,
              radius: 16,
              child: Text(
                widget.userName[0].toUpperCase(),
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black87,
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSender
                    ? SafeJetColors.primary
                    : isDark
                  ? SafeJetColors.primaryAccent.withOpacity(0.1)
                        : SafeJetColors.lightCardBackground,
                borderRadius: BorderRadius.circular(12),
          border: !isSender
              ? Border.all(
                  color: isDark
                      ? SafeJetColors.primaryAccent.withOpacity(0.2)
                      : SafeJetColors.lightCardBorder,
                )
              : null,
        ),
        child: Column(
                crossAxisAlignment:
                    isSender ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                              Text(
                    message['message'],
              style: TextStyle(
                color: isSender
                          ? Colors.white
                          : isDark
                              ? Colors.white
                              : Colors.black87,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                        DateFormat('HH:mm').format(
                          DateTime.parse(message['createdAt']),
                        ),
                  style: TextStyle(
                    fontSize: 10,
                    color: isSender
                              ? Colors.white70
                              : isDark
                                  ? Colors.grey[400]
                                  : SafeJetColors.lightTextSecondary,
                  ),
                ),
                if (isSender) ...[
                  const SizedBox(width: 4),
                  Icon(
                          _readMessages.contains(message['id'])
                              ? Icons.done_all
                              : _deliveredMessages.contains(message['id'])
                            ? Icons.done_all
                                  : Icons.done,
                    size: 12,
                          color: _readMessages.contains(message['id'])
                        ? SafeJetColors.success
                              : isSender
                                  ? Colors.white70
                                  : Colors.grey[400],
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
          ),
          if (isSender) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              backgroundColor: SafeJetColors.primary,
              radius: 16,
              child: Text(
                'You',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMessageInput(bool isDark) {
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
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: 'Type a message...',
                filled: true,
                fillColor: isDark
                    ? SafeJetColors.primaryAccent.withOpacity(0.1)
                    : SafeJetColors.lightCardBackground,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark
                        ? SafeJetColors.primaryAccent.withOpacity(0.2)
                        : SafeJetColors.lightCardBorder,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark
                        ? SafeJetColors.primaryAccent.withOpacity(0.2)
                        : SafeJetColors.lightCardBorder,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: SafeJetColors.primary,
                  ),
                ),
              ),
              maxLines: null,
              textCapitalization: TextCapitalization.sentences,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            decoration: BoxDecoration(
              color: SafeJetColors.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              onPressed: () async {
                if (_messageController.text.trim().isNotEmpty) {
                  await _sendMessage();
                }
              },
              icon: const Icon(Icons.send),
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _sendMessage() async {
    print('=== SENDING MESSAGE ===');
    try {
      await _p2pService.sendMessage(
        widget.trackingId,
        _messageController.text.trim(),
      );
      print('Message sent successfully');
        _messageController.clear();
    } catch (e) {
      print('=== MESSAGE SEND ERROR ===');
      print('Error sending message: $e');
      print(StackTrace.current);
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _messageSubscription?.cancel();
    _p2pService.disposeChatSocket();
    super.dispose();
  }
} 