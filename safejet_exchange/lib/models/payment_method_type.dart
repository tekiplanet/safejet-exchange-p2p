import 'payment_method_field.dart';

class PaymentMethodType {
  final String id;
  final String name;
  final String icon;
  final String? description;
  final bool isActive;
  final String createdAt;
  final String updatedAt;
  final List<PaymentMethodField> fields;

  PaymentMethodType({
    required this.id,
    required this.name,
    required this.icon,
    this.description,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    required this.fields,
  });

  factory PaymentMethodType.fromJson(Map<String, dynamic> json) {
    return PaymentMethodType(
      id: json['id'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String,
      description: json['description'] as String?,
      isActive: json['isActive'] as bool,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      fields: json['fields'] != null
          ? (json['fields'] as List)
              .map((field) => PaymentMethodField.fromJson(Map<String, dynamic>.from(field)))
              .toList()
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'icon': icon,
      'description': description,
      'isActive': isActive,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'fields': fields.map((field) => field.toJson()).toList(),
    };
  }
} 