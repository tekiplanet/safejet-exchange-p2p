import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/custom_app_bar.dart';
import '../../widgets/p2p_app_bar.dart';

class P2PChatScreen extends StatefulWidget {
  final String userName;
  final String orderId;

  const P2PChatScreen({
    super.key,
    required this.userName,
    required this.orderId,
  });

  @override
  State<P2PChatScreen> createState() => _P2PChatScreenState();
}

class _P2PChatScreenState extends State<P2PChatScreen> with TickerProviderStateMixin {
  final _messageController = TextEditingController();
  final List<Map<String, dynamic>> _messages = [
    {
      'text': 'Hello, I have placed the order',
      'isSender': true,
      'time': '12:30 PM',
      'status': 'read',
      'attachment': null,
    },
    {
      'text': 'Great! Please make the payment within 15 minutes',
      'isSender': false,
      'time': '12:31 PM',
      'status': 'delivered',
    },
  ];

  final List<String> _quickResponses = [
    'I have made the payment',
    'Please check your account',
    'Payment completed',
    'Thank you',
  ];

  bool _isTyping = false;
  Timer? _typingTimer;
  final Map<String, double> _uploadProgress = {};

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: '${widget.userName} • #${widget.orderId}',
        onNotificationTap: () {
          // TODO: Handle notification tap
        },
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return _buildMessageBubble(
                  message['text'] as String,
                  message['isSender'] as bool,
                  message['time'] as String,
                  isDark,
                );
              },
            ),
          ),
          _buildQuickResponses(isDark),
          _buildMessageInput(isDark),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(String text, bool isSender, String time, bool isDark) {
    final message = _messages.firstWhere(
      (m) => m['text'] == text && m['time'] == time,
      orElse: () => {'status': 'sent'},
    );

    return Align(
      alignment: isSender ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSender
              ? SafeJetColors.secondaryHighlight
              : (isDark
                  ? SafeJetColors.primaryAccent.withOpacity(0.1)
                  : SafeJetColors.lightCardBackground),
          borderRadius: BorderRadius.circular(16),
          border: !isSender
              ? Border.all(
                  color: isDark
                      ? SafeJetColors.primaryAccent.withOpacity(0.2)
                      : SafeJetColors.lightCardBorder,
                )
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (message['attachment'] != null) ...[
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: message['uploading'] == true
                        ? Container(
                            width: double.infinity,
                            height: 200,
                            color: isDark
                                ? SafeJetColors.primaryAccent.withOpacity(0.1)
                                : SafeJetColors.lightCardBackground,
                          )
                        : Image.network(
                            message['attachment'] as String,
                            width: double.infinity,
                            height: 200,
                            fit: BoxFit.cover,
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return Container(
                                height: 200,
                                color: isDark
                                    ? SafeJetColors.primaryAccent.withOpacity(0.1)
                                    : SafeJetColors.lightCardBackground,
                                child: Center(
                                  child: CircularProgressIndicator(
                                    value: loadingProgress.expectedTotalBytes != null
                                        ? loadingProgress.cumulativeBytesLoaded /
                                            loadingProgress.expectedTotalBytes!
                                        : null,
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                  if (message['uploading'] == true)
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.5),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircularProgressIndicator(
                                value: _uploadProgress[message['id'] as String],
                                color: Colors.white,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '${(_uploadProgress[message['id'] as String] ?? 0 * 100).toInt()}%',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
            ],
            Text(
              text,
              style: TextStyle(
                color: isSender
                    ? Colors.black
                    : (isDark ? Colors.white : Colors.black),
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  time,
                  style: TextStyle(
                    fontSize: 10,
                    color: isSender
                        ? Colors.black.withOpacity(0.5)
                        : (isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary),
                  ),
                ),
                if (isSender) ...[
                  const SizedBox(width: 4),
                  Icon(
                    message['status'] == 'sent'
                        ? Icons.check
                        : message['status'] == 'delivered'
                            ? Icons.done_all
                            : Icons.done_all,
                    size: 12,
                    color: message['status'] == 'read'
                        ? SafeJetColors.success
                        : (isSender
                            ? Colors.black.withOpacity(0.5)
                            : Colors.grey[400]),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.image_rounded),
              title: const Text('Send Image'),
              onTap: () {
                final messageId = DateTime.now().millisecondsSinceEpoch.toString();
                setState(() {
                  _messages.add({
                    'id': messageId,
                    'text': 'Payment screenshot',
                    'isSender': true,
                    'time': '${DateTime.now().hour}:${DateTime.now().minute}',
                    'status': 'sent',
                    'attachment': 'https://picsum.photos/300/200',
                    'uploading': true,
                  });
                  _uploadProgress[messageId] = 0;
                });
                Navigator.pop(context);
                _simulateFileUpload(messageId);
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded),
              title: const Text('Take Photo'),
              onTap: () {
                final messageId = DateTime.now().millisecondsSinceEpoch.toString();
                setState(() {
                  _messages.add({
                    'id': messageId,
                    'text': 'Camera photo',
                    'isSender': true,
                    'time': '${DateTime.now().hour}:${DateTime.now().minute}',
                    'status': 'sent',
                    'attachment': 'https://picsum.photos/300/200',
                    'uploading': true,
                  });
                  _uploadProgress[messageId] = 0;
                });
                Navigator.pop(context);
                _simulateFileUpload(messageId);
              },
            ),
            ListTile(
              leading: const Icon(Icons.file_copy_rounded),
              title: const Text('Send Document'),
              onTap: () {
                // TODO: Implement file picker
                Navigator.pop(context);
              },
            ),
          ],
        ),
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
          IconButton(
            onPressed: _showAttachmentOptions,
            icon: Icon(
              Icons.attach_file_rounded,
              color: isDark ? Colors.white : SafeJetColors.lightText,
            ),
          ),
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: 'Type a message...',
                hintStyle: TextStyle(
                  color: isDark
                      ? Colors.grey[600]
                      : SafeJetColors.lightTextSecondary,
                ),
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
                    color: SafeJetColors.secondaryHighlight,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          IconButton(
            onPressed: () => _sendMessage(_messageController.text),
            style: IconButton.styleFrom(
              backgroundColor: SafeJetColors.secondaryHighlight,
              padding: const EdgeInsets.all(12),
            ),
            icon: const Icon(
              Icons.send_rounded,
              color: Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickResponses(bool isDark) {
    return Container(
      height: 40,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _quickResponses.length,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: OutlinedButton(
              onPressed: () => _sendMessage(_quickResponses[index]),
              style: OutlinedButton.styleFrom(
                side: BorderSide(
                  color: isDark
                      ? SafeJetColors.primaryAccent.withOpacity(0.2)
                      : SafeJetColors.lightCardBorder,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
              child: Text(_quickResponses[index]),
            ),
          );
        },
      ),
    );
  }

  void _handleTyping() {
    setState(() => _isTyping = true);
    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 2), () {
      setState(() => _isTyping = false);
    });
  }

  Widget _buildTypingIndicator(bool isDark) {
    if (!_isTyping) return const SizedBox.shrink();
    
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
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
                _buildDot(1),
                _buildDot(2),
                _buildDot(3),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDot(int index) {
    return AnimatedBuilder(
      animation: AnimationController(
        duration: const Duration(milliseconds: 300),
        vsync: this,
      )..repeat(reverse: true),
      builder: (context, child) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 2),
          height: 6,
          width: 6,
          decoration: BoxDecoration(
            color: Colors.grey[400],
            shape: BoxShape.circle,
          ),
        );
      },
    );
  }

  void _sendMessage(String text) {
    if (text.trim().isNotEmpty) {
      setState(() {
        _messages.add({
          'text': text,
          'isSender': true,
          'time': '${DateTime.now().hour}:${DateTime.now().minute}',
          'status': 'sent',
        });
        _messageController.clear();
      });

      Future.delayed(const Duration(seconds: 1), () {
        setState(() {
          _messages.last['status'] = 'delivered';
        });
      });

      Future.delayed(const Duration(seconds: 2), () {
        setState(() {
          _messages.last['status'] = 'read';
        });
      });
    }
  }

  void _simulateFileUpload(String messageId) {
    double progress = 0;
    Timer.periodic(const Duration(milliseconds: 100), (timer) {
      if (progress >= 1) {
        timer.cancel();
        setState(() {
          final messageIndex = _messages.indexWhere((m) => m['id'] == messageId);
          if (messageIndex != -1) {
            _messages[messageIndex]['uploading'] = false;
          }
          _uploadProgress.remove(messageId);
        });
        return;
      }

      progress += 0.1;
      setState(() {
        _uploadProgress[messageId] = progress;
      });
    });
  }
} 