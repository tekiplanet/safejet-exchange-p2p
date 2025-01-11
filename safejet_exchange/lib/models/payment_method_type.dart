import 'payment_method_field.dart';

class PaymentMethodType {
  final String id;
  final String name;
  final String icon;
  final String description;
  final bool isActive;
  final List<PaymentMethodField> fields;

  PaymentMethodType({
    required this.id,
    required this.name,
    required this.icon,
    required this.description,
    required this.isActive,
    required this.fields,
  });

  factory PaymentMethodType.fromJson(Map<String, dynamic> json) {
    return PaymentMethodType(
      id: json['id'],
      name: json['name'],
      icon: json['icon'],
      description: json['description'],
      isActive: json['isActive'],
      fields: (json['fields'] as List)
          .map((field) => PaymentMethodField.fromJson(field))
          .toList(),
    );
  }
} 