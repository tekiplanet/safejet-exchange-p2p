import 'package:flutter/material.dart';
import '../config/theme/colors.dart';

class VerificationStatusCard extends StatelessWidget {
  final String type;
  final String status;
  final String? documentType;
  final String? failureReason;
  final DateTime? lastAttempt;
  final VoidCallback? onRetry;

  const VerificationStatusCard({
    Key? key,
    required this.type,
    required this.status,
    this.documentType,
    this.failureReason,
    this.lastAttempt,
    this.onRetry,
  }) : super(key: key);

  Color _getStatusColor() {
    switch (status) {
      case 'completed':
        return SafeJetColors.success;
      case 'failed':
        return Colors.red;
      case 'processing':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon() {
    switch (status) {
      case 'completed':
        return Icons.check_circle;
      case 'failed':
        return Icons.error;
      case 'processing':
        return Icons.hourglass_empty;
      default:
        return Icons.pending;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _getStatusColor().withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _getStatusIcon(),
                color: _getStatusColor(),
              ),
              const SizedBox(width: 8),
              Text(
                '$type Verification',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: _getStatusColor().withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    color: _getStatusColor(),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          if (documentType != null) ...[
            const SizedBox(height: 8),
            Text(
              'Document: $documentType',
              style: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
          ],
          if (failureReason != null) ...[
            const SizedBox(height: 8),
            Text(
              'Reason: $failureReason',
              style: const TextStyle(
                color: Colors.red,
              ),
            ),
          ],
          if (lastAttempt != null) ...[
            const SizedBox(height: 8),
            Text(
              'Last attempt: ${lastAttempt!.toLocal().toString().split('.')[0]}',
              style: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                fontSize: 12,
              ),
            ),
          ],
          if (status == 'failed' && onRetry != null) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry Verification'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: _getStatusColor(),
                  side: BorderSide(color: _getStatusColor()),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
} 