import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../../services/p2p_service.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';
import '../../widgets/image_viewer.dart';
import '../../widgets/loading_indicator.dart';

class P2PDisputeChatScreen extends StatefulWidget {
  final String disputeId;
  final String orderId;
  final bool isAdmin;
  final String disputeTitle;

  const P2PDisputeChatScreen({
    super.key,
    required this.disputeId,
    required this.orderId,
    this.isAdmin = false,
    required this.disputeTitle,
  });

  @override
  State<P2PDisputeChatScreen> createState() => _P2PDisputeChatScreenState();
}

class _P2PDisputeChatScreenState extends State<P2PDisputeChatScreen> {
  final P2PService _p2pService = GetIt.I<P2PService>();
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  final Set<String> _deliveredMessages = {};
  final Set<String> _readMessages = {};
  bool _isLoading = true;
  Map<String, dynamic>? _disputeDetails;
  List<StreamSubscription> _subscriptions = [];
  File? _selectedImage;
  String? _currentUserId;
  bool _isInitializing = true;

  @override
  void initState() {
    super.initState();
    _initializeChat();
  }

  Future<void> _initializeChat() async {
    print('=== INITIALIZING DISPUTE CHAT ===');
    print('DisputeID: ${widget.disputeId}');
    print('OrderID: ${widget.orderId}');
    try {
      // Fetch the current user ID from secure storage
      final userId = await _p2pService.storage.read(key: 'userId');
      setState(() {
        _currentUserId = userId;
        print('Current user ID: $_currentUserId');
      });

      // Connect to the dispute chat socket
      await _p2pService.connectToDisputeChat();
      print('Connected to dispute chat service');

      // Join the dispute chat room
      _p2pService.joinDisputeChat(widget.disputeId);
      print('Joined dispute chat: ${widget.disputeId}');
      
      // Fetch dispute details (optional)
      try {
        final details = await _p2pService.getDisputeByOrderId(widget.orderId);
        setState(() {
          _disputeDetails = details;
        });
        print('Dispute details loaded');
      } catch (e) {
        print('Error loading dispute details: $e');
      }
      
      // Fetch initial messages
      final messages = await _p2pService.getDisputeMessages(widget.disputeId);
      print('Fetched initial dispute messages: ${messages.length}');

      setState(() {
        _messages = messages;
        _isLoading = false;
        _isInitializing = false;
      });
      print('Set initial dispute messages in state');

      // Setup message listeners
      _setupMessageListeners();
      
      // Scroll to bottom once messages are loaded
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollToBottom();
      });
    } catch (e) {
      print('=== DISPUTE CHAT INITIALIZATION ERROR ===');
      print('Error initializing dispute chat: $e');
      print(StackTrace.current);
      setState(() {
        _isLoading = false;
        _isInitializing = false;
      });
    }
  }

  void _setupMessageListeners() {
    _subscriptions.clear();
    _subscriptions.addAll([
      _p2pService.listenToDisputeMessages(widget.disputeId, (message) {
        print('=== NEW DISPUTE MESSAGE CALLBACK ===');
        print('Current DisputeID: ${widget.disputeId}');
        print('Message received: $message');
        print('=== MESSAGE DETAILS ===');
        print('Current messages count: ${_messages.length}');
        print('Message ID: ${message['id']}');
        print('Sender ID: ${message['senderId']}');
        setState(() {
          if (!_messages.any((m) => m['id'] == message['id'])) {
            _messages.add(message);
            print('Added new dispute message to state');
            print('New messages count: ${_messages.length}');
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _scrollToBottom();
            });
          } else {
            print('Message already exists in state');
            print('Duplicate message ID: ${message['id']}');
          }
        });
      }),
      _p2pService.listenToDisputeDeliveryStatus(widget.disputeId, (messageId) {
        if (!mounted) return;
        setState(() {
          final index = _messages.indexWhere((m) => m['id'] == messageId);
          if (index != -1) {
            _messages[index] = {
              ..._messages[index],
              'isDelivered': true,
            };
          }
        });
      }),
      _p2pService.listenToDisputeReadStatus(widget.disputeId, (messageId) {
        if (!mounted) return;
        setState(() {
          final index = _messages.indexWhere((m) => m['id'] == messageId);
          if (index != -1) {
            _messages[index] = {
              ..._messages[index],
              'isDelivered': true,
              'isRead': true,
            };
          }
        });
      }),
    ]);
    print('Dispute message listeners set up');
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: widget.disputeTitle,
        onNotificationTap: () {
          // Handle notification tap
        },
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: _isInitializing 
        ? const Center(child: LoadingIndicator())
        : Column(
          children: [
            Expanded(
              child: _isLoading
                ? const Center(child: LoadingIndicator())
                : _messages.isEmpty
                  ? Center(
                      child: Text(
                        'No messages yet',
                        style: TextStyle(
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final message = _messages[index];
                        return _buildMessageItem(message, isDark);
                      },
                    ),
            ),
            _buildMessageInput(isDark),
          ],
        ),
    );
  }

  Widget _buildMessageItem(Map<String, dynamic> message, bool isDark) {
    final senderType = message['senderType']?.toString().toLowerCase() ?? '';
    final senderId = message['senderId']?.toString() ?? '';
    final isSystem = senderType == 'system';
    final isAdmin = senderType == 'admin';
    final isCurrentUser = senderId == _currentUserId;
    final messageId = message['id'];
    
    // If it's a system message, display a special bubble
    if (isSystem) {
      return _buildSystemMessage(message, isDark);
    }
    
    // If it's from admin, display it with admin styling
    if (isAdmin) {
      return _buildAdminMessage(message, isDark);
    }

    // Only mark other's messages as delivered/read
    if (!isCurrentUser) {
      if (!message['isDelivered']) {
        _p2pService.markDisputeMessageAsDelivered(messageId);
      }
      if (!message['isRead']) {
        _p2pService.markDisputeMessageAsRead(messageId);
      }
    }

    // Determine if the sender is a buyer or seller
    final isSenderBuyer = _isSenderBuyer(message);
    
    // Display user messages (either current user or other party)
    return _buildUserMessage(message, isCurrentUser, isDark, isSenderBuyer);
  }

  // Helper method to determine if a sender is a buyer based on message data
  bool _isSenderBuyer(Map<String, dynamic> message) {
    // First try to get role from the message itself
    if (message['senderRole']?.toString().toLowerCase() == 'buyer') {
      return true;
    } else if (message['senderRole']?.toString().toLowerCase() == 'seller') {
      return false;
    }
    
    // Try to infer from dispute details if available
    if (_disputeDetails != null) {
      final dispute = _disputeDetails!;
      final senderId = message['senderId']?.toString() ?? '';
      
      // Check if sender is initiator or respondent and their role
      final initiatorId = dispute['initiatorId']?.toString() ?? '';
      final respondentId = dispute['respondentId']?.toString() ?? '';
      final buyerId = dispute['order']?['buyerId']?.toString() ?? '';
      final sellerId = dispute['order']?['sellerId']?.toString() ?? '';
      
      if (senderId == buyerId) {
        return true; // Sender is the buyer
      } else if (senderId == sellerId) {
        return false; // Sender is the seller
      } else if (senderId == initiatorId && dispute['order']?['buyerId'] == initiatorId) {
        return true; // Initiator is buyer
      } else if (senderId == respondentId && dispute['order']?['buyerId'] == respondentId) {
        return true; // Respondent is buyer
      } else if (senderId == initiatorId && dispute['order']?['sellerId'] == initiatorId) {
        return false; // Initiator is seller
      } else if (senderId == respondentId && dispute['order']?['sellerId'] == respondentId) {
        return false; // Respondent is seller
      }
    }
    
    // Default to false (seller) if we can't determine
    return false;
  }

  Widget _buildSystemMessage(Map<String, dynamic> message, bool isDark) {
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message['message'],
                  style: TextStyle(
                    color: SafeJetColors.warning,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  DateFormat('MMM dd, yyyy HH:mm').format(
                    DateTime.parse(message['createdAt']),
                  ),
                  style: TextStyle(
                    fontSize: 10,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdminMessage(Map<String, dynamic> message, bool isDark) {
    final adminName = message['sender']?['username'] ?? 'Admin';
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            backgroundColor: SafeJetColors.primary,
            radius: 16,
            child: Icon(
              Icons.admin_panel_settings,
              color: Colors.white,
              size: 16,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: SafeJetColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    adminName,
                    style: TextStyle(
                      color: SafeJetColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                _buildMessageContent(message, false, isDark, false),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserMessage(Map<String, dynamic> message, bool isCurrentUser, bool isDark, bool isBuyer) {
    final userName = message['sender']?['username'] ?? (isBuyer ? 'Buyer' : 'Seller');
    final roleLabel = isBuyer ? 'Buyer' : 'Seller';
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: isCurrentUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isCurrentUser) ...[
            CircleAvatar(
              backgroundColor: isBuyer
                  ? SafeJetColors.blue.withOpacity(0.2)
                  : SafeJetColors.success.withOpacity(0.2),
              radius: 16,
              child: Text(
                isBuyer ? 'B' : 'S',
                style: TextStyle(
                  color: isBuyer ? SafeJetColors.blue : SafeJetColors.success,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isCurrentUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isCurrentUser) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    margin: const EdgeInsets.only(bottom: 4),
                    decoration: BoxDecoration(
                      color: isBuyer 
                          ? SafeJetColors.blue.withOpacity(0.1)
                          : SafeJetColors.success.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      roleLabel,
                      style: TextStyle(
                        color: isBuyer ? SafeJetColors.blue : SafeJetColors.success,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
                _buildMessageContent(message, isCurrentUser, isDark, isBuyer),
              ],
            ),
          ),
          if (isCurrentUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              backgroundColor: isBuyer
                  ? SafeJetColors.blue
                  : SafeJetColors.success,
              radius: 16,
              child: Text(
                isBuyer ? 'B' : 'S',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMessageContent(Map<String, dynamic> message, bool isCurrentUser, bool isDark, bool isBuyer) {
    final bubbleColor = isCurrentUser
        ? (isBuyer ? SafeJetColors.blue : SafeJetColors.success)
        : isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground;
            
    final borderColor = !isCurrentUser
        ? isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.2)
            : SafeJetColors.lightCardBorder
        : Colors.transparent;
        
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bubbleColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: borderColor,
          width: !isCurrentUser ? 1 : 0,
        ),
      ),
      child: Column(
        crossAxisAlignment: isCurrentUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (message['attachmentUrl'] != null) ...[
            Container(
              margin: EdgeInsets.only(bottom: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ImageViewer(
                          imageUrl: '${_p2pService.apiUrl}/p2p/chat/images/${message['attachmentUrl']}',
                        ),
                      ),
                    );
                  },
                  child: Hero(
                    tag: message['attachmentUrl'],
                    child: Image.network(
                      '${_p2pService.apiUrl}/p2p/chat/images/${message['attachmentUrl']}',
                      width: 200,
                      fit: BoxFit.cover,
                      loadingBuilder: (context, child, progress) {
                        if (progress == null) return child;
                        return Container(
                          width: 200,
                          height: 150,
                          child: Center(
                            child: CircularProgressIndicator(
                              value: progress.expectedTotalBytes != null
                                  ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes!
                                  : null,
                            ),
                          ),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) {
                        print('Error loading image: $error');
                        return Container(
                          width: 200,
                          height: 150,
                          color: Colors.grey[300],
                          child: Icon(Icons.error),
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),
          ],
          Text(
            message['message'],
            style: TextStyle(
              color: isCurrentUser
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
                  color: isCurrentUser
                      ? Colors.white70
                      : isDark
                          ? Colors.grey[400]
                          : SafeJetColors.lightTextSecondary,
                ),
              ),
              if (isCurrentUser) ...[
                const SizedBox(width: 4),
                Icon(
                  message['isRead']
                      ? Icons.done_all
                      : message['isDelivered']
                          ? Icons.done_all
                          : Icons.done,
                  size: 12,
                  color: message['isRead']
                      ? SafeJetColors.success
                      : isCurrentUser
                          ? Colors.white70
                          : Colors.grey[400],
                ),
              ],
            ],
          ),
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
      child: Column(
        children: [
          if (_selectedImage != null)
            Container(
              height: 100,
              width: 100,
              margin: EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                image: DecorationImage(
                  image: FileImage(_selectedImage!),
                  fit: BoxFit.cover,
                ),
              ),
              child: Stack(
                alignment: Alignment.topRight,
                children: [
                  IconButton(
                    icon: Icon(Icons.close, color: Colors.white),
                    onPressed: () {
                      setState(() {
                        _selectedImage = null;
                      });
                    },
                  ),
                ],
              ),
            ),
          Row(
            children: [
              IconButton(
                icon: Icon(Icons.attach_file),
                onPressed: () async {
                  final ImagePicker _picker = ImagePicker();
                  final XFile? image = await _picker.pickImage(
                    source: ImageSource.gallery,
                    maxWidth: 800,
                    maxHeight: 800,
                  );
                  
                  if (image != null) {
                    setState(() {
                      _selectedImage = File(image.path);
                    });
                  }
                },
              ),
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
                  onPressed: () => _sendMessage(),
                  icon: const Icon(Icons.send),
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty && _selectedImage == null) {
      return;
    }
    
    String? base64Image;
    if (_selectedImage != null) {
      final bytes = await _selectedImage!.readAsBytes();
      base64Image = 'data:image/jpeg;base64,${base64.encode(bytes)}';
    }
    
    await _p2pService.sendDisputeMessage(
      widget.disputeId,
      _messageController.text,
      attachment: base64Image,
    );
    
    _messageController.clear();
    setState(() {
      _selectedImage = null;
    });
  }

  @override
  void dispose() {
    for (var subscription in _subscriptions) {
      subscription.cancel();
    }
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
} 