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
      id: json['id'],
      name: json['name'],
      icon: json['icon'],
      isDefault: json['isDefault'] ?? false,
      isVerified: json['isVerified'] ?? false,
      details: json['details'] ?? {},
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'icon': icon,
      'isDefault': isDefault,
      'isVerified': isVerified,
      'details': details,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
} 