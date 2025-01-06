import './kyc_level.dart';

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
}

class UserDetails {
  final String fullName;
  final String email;
  final bool emailVerified;
  final bool phoneVerified;

  UserDetails({
    required this.fullName,
    required this.email,
    required this.emailVerified,
    required this.phoneVerified,
  });

  factory UserDetails.fromJson(Map<String, dynamic> json) {
    return UserDetails(
      fullName: json['fullName'],
      email: json['email'],
      emailVerified: json['emailVerified'],
      phoneVerified: json['phoneVerified'],
    );
  }
}