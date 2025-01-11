class PaymentMethod {
  final String id;
  final String name;
  final String icon;
  final bool isDefault;
  final bool isVerified;
  final Map<String, dynamic> details;
  final DateTime createdAt;
  final DateTime updatedAt;

  PaymentMethod({
    required this.id,
    required this.name,
    required this.icon,
    required this.isDefault,
    required this.isVerified,
    required this.details,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      id: json['Id'],
      name: json['Name'],
      icon: json['Icon'],
      isDefault: json['IsDefault'],
      isVerified: json['IsVerified'],
      details: json['Details'],
      createdAt: DateTime.parse(json['CreatedAt']),
      updatedAt: DateTime.parse(json['UpdatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'Id': id,
      'Name': name,
      'Icon': icon,
      'IsDefault': isDefault,
      'IsVerified': isVerified,
      'Details': details,
      'CreatedAt': createdAt.toIso8601String(),
      'UpdatedAt': updatedAt.toIso8601String(),
    };
  }
} 