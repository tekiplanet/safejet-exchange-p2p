import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';

class P2PDisputeDetailsScreen extends StatefulWidget {
  final String orderId;

  const P2PDisputeDetailsScreen({
    super.key,
    required this.orderId,
  });

  @override
  State<P2PDisputeDetailsScreen> createState() => _P2PDisputeDetailsScreenState();
}

class _P2PDisputeDetailsScreenState extends State<P2PDisputeDetailsScreen> {
  final TextEditingController _messageController = TextEditingController();
  final List<Map<String, dynamic>> _messages = [
    {
      'sender': 'user',
      'message': 'I have not received the payment yet.',
      'time': '12:30 PM',
      'isEvidence': false,
      'status': 'read',
    },
    {
      'sender': 'admin',
      'message': 'Please provide the payment proof if available.',
      'time': '12:45 PM',
      'isEvidence': false,
      'status': 'read',
    },
    {
      'sender': 'user',
      'message': 'Here is my bank statement showing no incoming transfer.',
      'time': '1:00 PM',
      'isEvidence': true,
      'evidenceType': 'image',
      'evidenceUrl': 'https://picsum.photos/800/600',
      'status': 'delivered',
    },
  ];

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Dispute Details',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: Column(
        children: [
          // Status and Details Cards in a scrollable area
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildStatusCard(isDark),
                const SizedBox(height: 16),
                _buildOrderDetailsCard(isDark),
                const SizedBox(height: 16),
                _buildDisputeTimeline(isDark),
                const SizedBox(height: 16),
                _buildDisputeChat(isDark),
              ],
            ),
          ),
          // Message Input
          _buildMessageInput(isDark),
        ],
      ),
    );
  }

  Widget _buildStatusCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '#${widget.orderId}',
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
                  color: SafeJetColors.warning.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'IN PROGRESS',
                  style: TextStyle(
                    color: SafeJetColors.warning,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Dispute Reason',
            style: TextStyle(
              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Payment not received',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderDetailsCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
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
          _buildDetailRow('Amount:', '1,234.56 USDT', isDark),
          _buildDetailRow('Price:', '₦750.00/USDT', isDark),
          _buildDetailRow('Total:', '₦925,920.00', isDark),
          _buildDetailRow('Created:', 'Oct 12, 2023 12:30 PM', isDark),
          _buildDetailRow('Counterparty:', 'JohnSeller', isDark),
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
              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDisputeTimeline(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Dispute Progress',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          _buildTimelineItem(
            'Dispute Opened',
            'Oct 12, 2023 12:30 PM',
            'Payment not received from buyer',
            isDark,
            isFirst: true,
            isCompleted: true,
          ),
          _buildTimelineItem(
            'Evidence Required',
            'Oct 12, 2023 12:45 PM',
            'Admin requested payment proof',
            isDark,
            isCompleted: true,
          ),
          _buildTimelineItem(
            'Evidence Submitted',
            'Oct 12, 2023 1:00 PM',
            'Payment proof submitted by buyer',
            isDark,
            isCompleted: true,
          ),
          _buildTimelineItem(
            'Under Review',
            'Oct 12, 2023 1:15 PM',
            'Admin is reviewing the evidence',
            isDark,
            isInProgress: true,
          ),
          _buildTimelineItem(
            'Resolution',
            'Pending',
            'Final decision will be made',
            isDark,
            isLast: true,
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(
    String title,
    String time,
    String description,
    bool isDark, {
    bool isFirst = false,
    bool isLast = false,
    bool isCompleted = false,
    bool isInProgress = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: isCompleted || isInProgress
                    ? SafeJetColors.warning
                    : (isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.1)),
                shape: BoxShape.circle,
                border: isInProgress
                    ? Border.all(
                        color: SafeJetColors.warning.withOpacity(0.3),
                        width: 4,
                      )
                    : null,
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 40,
                color: isCompleted
                    ? SafeJetColors.warning
                    : (isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.1)),
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isInProgress ? SafeJetColors.warning : null,
                ),
              ),
              Text(
                time,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: TextStyle(
                  color: isDark ? Colors.grey[300] : SafeJetColors.lightText,
                ),
              ),
              if (!isLast) const SizedBox(height: 16),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDisputeChat(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Dispute Chat',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          ..._messages.map((message) => _buildMessage(message, isDark)),
        ],
      ),
    );
  }

  Widget _buildMessage(Map<String, dynamic> message, bool isDark) {
    final isUser = message['sender'] == 'user';
    final isAdmin = message['sender'] == 'admin';

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isUser) _buildAdminBadge(isDark),
          const SizedBox(width: 8),
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isAdmin
                    ? SafeJetColors.warning.withOpacity(0.1)
                    : (isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.1)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (message['isEvidence'])
                    _buildEvidencePreview(message),
                  Text(
                    message['message'],
                    style: TextStyle(
                      color: isAdmin ? SafeJetColors.warning : null,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        message['time'],
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                        ),
                      ),
                      if (isUser) ...[
                        const SizedBox(width: 4),
                        _buildMessageStatus(message['status'] ?? 'sent', isDark),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdminBadge(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: SafeJetColors.warning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        'ADMIN',
        style: TextStyle(
          color: SafeJetColors.warning,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildEvidencePreview(Map<String, dynamic> message) {
    return Container(
      height: 200,
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(8),
        image: DecorationImage(
          image: NetworkImage(message['evidenceUrl']),
          fit: BoxFit.cover,
        ),
      ),
    );
  }

  Widget _buildMessageStatus(String status, bool isDark) {
    IconData icon;
    Color color = isDark ? Colors.grey[400]! : SafeJetColors.lightTextSecondary;

    switch (status) {
      case 'sent':
        icon = Icons.check;
        break;
      case 'delivered':
        icon = Icons.done_all;
        break;
      case 'read':
        icon = Icons.done_all;
        color = SafeJetColors.success;
        break;
      default:
        icon = Icons.access_time;
        break;
    }

    return Icon(
      icon,
      size: 14,
      color: color,
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
            onPressed: _handleAttachment,
            icon: const Icon(Icons.attach_file_rounded),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: 'Type your message...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: isDark
                    ? Colors.white.withOpacity(0.05)
                    : Colors.black.withOpacity(0.05),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: _sendMessage,
            icon: const Icon(Icons.send_rounded),
            color: SafeJetColors.warning,
          ),
        ],
      ),
    );
  }

  void _handleAttachment() {
    // TODO: Implement file attachment
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    setState(() {
      _messages.add({
        'sender': 'user',
        'message': _messageController.text,
        'time': '${DateTime.now().hour}:${DateTime.now().minute}',
        'isEvidence': false,
        'status': 'sent',
      });
    });

    _messageController.clear();

    // Simulate message delivery and read status
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _messages.last['status'] = 'delivered';
        });
      }
    });

    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _messages.last['status'] = 'read';
        });
      }
    });
  }
} 