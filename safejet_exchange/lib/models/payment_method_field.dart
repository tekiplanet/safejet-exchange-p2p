class PaymentMethodField {
  final String id;
  final String name;
  final String label;
  final String type;
  final String? placeholder;
  final String? helpText;
  final Map<String, dynamic>? validationRules;
  final bool isRequired;
  final int order;

  PaymentMethodField({
    required this.id,
    required this.name,
    required this.label,
    required this.type,
    this.placeholder,
    this.helpText,
    this.validationRules,
    required this.isRequired,
    required this.order,
  });

  factory PaymentMethodField.fromJson(Map<String, dynamic> json) {
    return PaymentMethodField(
      id: json['id'],
      name: json['name'],
      label: json['label'],
      type: json['type'],
      placeholder: json['placeholder'],
      helpText: json['helpText'],
      validationRules: json['validationRules'],
      isRequired: json['isRequired'],
      order: json['order'],
    );
  }
} 