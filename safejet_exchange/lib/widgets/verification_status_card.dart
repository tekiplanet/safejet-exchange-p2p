import 'package:flutter/material.dart';
import '../config/theme/colors.dart';
import 'package:intl/intl.dart';
import '../models/kyc_details.dart';
import 'package:animate_do/animate_do.dart';

class VerificationStatusCard extends StatelessWidget {
  final String type;
  final IdentityVerification? identityStatus;
  final AddressVerification? addressStatus;
  final VoidCallback? onRetry;

  const VerificationStatusCard({
    Key? key,
    required this.type,
    this.identityStatus,
    this.addressStatus,
    this.onRetry,
  }) : super(key: key);

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return SafeJetColors.success;
      case 'failed':
        return SafeJetColors.error;
      case 'processing':
        return SafeJetColors.warning;
      default:
        return SafeJetColors.info;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Verified';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing';
      default:
        return 'Pending';
    }
  }

  String? _getFailureReason() {
    if (type == 'Identity') {
      return identityStatus?.reviewRejectDetails ?? identityStatus?.failureReason;
    } else {
      return addressStatus?.failureReason;
    }
  }

  DateTime? _getLastAttempt() {
    return type == 'Identity' 
        ? identityStatus?.lastAttempt 
        : addressStatus?.lastAttempt;
  }

  String _getStatus() {
    return type == 'Identity' 
        ? identityStatus?.status ?? 'pending'
        : addressStatus?.status ?? 'pending';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final status = _getStatus();
    final statusColor = _getStatusColor(status);
    final statusText = _getStatusText(status);
    final failureReason = _getFailureReason();
    final lastAttempt = _getLastAttempt();

    return FadeInDown(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      status.toLowerCase() == 'completed' 
                          ? Icons.verified_user
                          : status.toLowerCase() == 'failed'
                              ? Icons.error_outline
                              : Icons.pending_outlined,
                      color: statusColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '$type Verification',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          if (failureReason != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SafeJetColors.error.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: SafeJetColors.error,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      failureReason,
                      style: TextStyle(
                        color: SafeJetColors.error,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (lastAttempt != null) ...[
            const SizedBox(height: 8),
            Text(
              'Last attempt: ${DateFormat.yMMMd().add_jm().format(lastAttempt)}',
              style: TextStyle(
                color: isDark ? Colors.white60 : Colors.black54,
                fontSize: 12,
              ),
            ),
          ],
          if (status == 'failed' && onRetry != null) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 40,
              child: ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retry Verification'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: SafeJetColors.primary,
                  foregroundColor: Colors.white,
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