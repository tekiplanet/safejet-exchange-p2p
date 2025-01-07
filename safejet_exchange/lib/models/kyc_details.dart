import 'package:safejet_exchange/models/kyc_level.dart';
import 'package:safejet_exchange/models/user_details.dart';

class KYCDetails {
  final int currentLevel;
  final KYCLevel levelDetails;
  final UserDetails userDetails;
  final Map<String, dynamic>? kycData;

  KYCDetails({
    required this.currentLevel,
    required this.levelDetails,
    required this.userDetails,
    this.kycData,
  });

  factory KYCDetails.fromJson(Map<String, dynamic> json) {
    return KYCDetails(
      currentLevel: json['currentLevel'],
      levelDetails: KYCLevel.fromJson(json['levelDetails']),
      userDetails: UserDetails.fromJson(json['userDetails']),
      kycData: json['kycData'],
    );
  }

  VerificationStatus? get identityVerificationStatus {
    return kycData?['verificationStatus']?['identity'] != null
        ? VerificationStatus.fromJson(kycData!['verificationStatus']['identity'])
        : null;
  }

  VerificationStatus? get addressVerificationStatus {
    return kycData?['verificationStatus']?['address'] != null
        ? VerificationStatus.fromJson(kycData!['verificationStatus']['address'])
        : null;
  }
}

class VerificationStatus {
  final String status;
  final String? documentType;
  final String? failureReason;
  final DateTime? lastAttempt;

  VerificationStatus({
    required this.status,
    this.documentType,
    this.failureReason,
    this.lastAttempt,
  });

  factory VerificationStatus.fromJson(Map<String, dynamic> json) {
    return VerificationStatus(
      status: json['status'] ?? 'pending',
      documentType: json['documentType'],
      failureReason: json['failureReason'],
      lastAttempt: json['lastAttempt'] != null 
          ? DateTime.parse(json['lastAttempt']) 
          : null,
    );
  }
}