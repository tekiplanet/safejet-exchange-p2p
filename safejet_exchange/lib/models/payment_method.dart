import 'payment_method_type.dart';

class PaymentMethod {
  final String id;
  final String userId;
  final String paymentMethodTypeId;
  final bool isDefault;
  final bool isVerified;
  final Map<String, dynamic> details;
  final String createdAt;
  final String updatedAt;
  final PaymentMethodType? paymentMethodType;

  String get name => details['name'] ?? '';
  String get icon => paymentMethodType?.icon ?? 'account_balance';

  PaymentMethod({
    required this.id,
    required this.userId,
    required this.paymentMethodTypeId,
    required this.isDefault,
    required this.isVerified,
    required this.details,
    required this.createdAt,
    required this.updatedAt,
    this.paymentMethodType,
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      id: json['id'] as String,
      userId: json['userId'] as String,
      paymentMethodTypeId: json['paymentMethodTypeId'] as String,
      isDefault: json['isDefault'] as bool,
      isVerified: json['isVerified'] as bool,
      details: Map<String, dynamic>.from(json['details'] ?? {}),
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      paymentMethodType: json['paymentMethodType'] != null 
          ? PaymentMethodType.fromJson(Map<String, dynamic>.from(json['paymentMethodType']))
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'paymentMethodTypeId': paymentMethodTypeId,
      'isDefault': isDefault,
      'isVerified': isVerified,
      'details': details,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'paymentMethodType': paymentMethodType?.toJson(),
    };
  }
} 