import 'package:flutter/material.dart';
import '../config/theme/colors.dart';
import '../models/payment_method.dart';

class PaymentMethodDialog extends StatefulWidget {
  final PaymentMethod? method; // null for add, non-null for edit
  final bool isDark;

  const PaymentMethodDialog({
    super.key,
    this.method,
    required this.isDark,
  });

  @override
  State<PaymentMethodDialog> createState() => _PaymentMethodDialogState();
}

class _PaymentMethodDialogState extends State<PaymentMethodDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  bool _isDefault = false;
  bool _isLoading = false;
  String _selectedIcon = 'account_balance'; // default icon
  Map<String, dynamic> _details = {};

  final List<Map<String, dynamic>> _availableIcons = [
    {'icon': Icons.account_balance, 'name': 'Bank'},
    {'icon': Icons.payment, 'name': 'Card'},
    {'icon': Icons.attach_money, 'name': 'Cash'},
    {'icon': Icons.mobile_friendly, 'name': 'Mobile Money'},
    {'icon': Icons.currency_exchange, 'name': 'Exchange'},
  ];

  final List<String> _availableDetailFields = [
    'Bank Name',
    'Account Number',
    'Account Name',
    'Email',
    'Phone Number',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.method != null) {
      _nameController.text = widget.method!.name;
      _isDefault = widget.method!.isDefault;
      _selectedIcon = widget.method!.icon;
      _details = Map<String, dynamic>.from(widget.method!.details);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.method == null ? 'Add Payment Method' : 'Edit Payment Method',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              
              // Name Field
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Name',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Icon Selection
              Text(
                'Select Icon',
                style: TextStyle(
                  color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 80,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _availableIcons.length,
                  itemBuilder: (context, index) {
                    final iconData = _availableIcons[index];
                    final isSelected = _selectedIcon == iconData['icon'].toString();
                    return Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: Column(
                        children: [
                          InkWell(
                            onTap: () {
                              setState(() {
                                _selectedIcon = iconData['icon'].toString();
                              });
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? SafeJetColors.secondaryHighlight
                                    : (widget.isDark
                                        ? Colors.white.withOpacity(0.05)
                                        : Colors.black.withOpacity(0.05)),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                iconData['icon'] as IconData,
                                color: isSelected ? Colors.black : null,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            iconData['name'],
                            style: TextStyle(
                              fontSize: 12,
                              color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),

              // Details Section
              Text(
                'Payment Details',
                style: TextStyle(
                  color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: widget.isDark 
                      ? Colors.white.withOpacity(0.05)
                      : Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: _availableDetailFields.map((field) {
                    final key = field.toLowerCase().replaceAll(' ', '_');
                    return Padding(
                      padding: const EdgeInsets.all(12),
                      child: TextFormField(
                        initialValue: _details[key],
                        onChanged: (value) {
                          setState(() {
                            _details[key] = value;
                          });
                        },
                        decoration: InputDecoration(
                          labelText: field,
                          filled: true,
                          fillColor: widget.isDark 
                              ? Colors.black.withOpacity(0.2)
                              : Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter $field';
                          }
                          return null;
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 24),

              // Default Payment Method Switch
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: widget.isDark 
                      ? Colors.white.withOpacity(0.05)
                      : Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Set as Default',
                            style: TextStyle(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            'Use this as your primary payment method',
                            style: TextStyle(
                              fontSize: 12,
                              color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _isDefault,
                      onChanged: _handleDefaultToggle,
                      activeColor: SafeJetColors.secondaryHighlight,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Action Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _isLoading ? null : () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: SafeJetColors.secondaryHighlight,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                            ),
                          )
                        : Text(widget.method == null ? 'Add' : 'Save'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleSubmit() {
    if (_formKey.currentState?.validate() ?? false) {
      final data = {
        'name': _nameController.text,
        'icon': _selectedIcon,
        'isDefault': _isDefault,
        'details': _details,
      };
      Navigator.pop(context, data);
    }
  }

  Future<void> _handleDefaultToggle(bool value) async {
    if (!value) {
      setState(() => _isDefault = value);
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Set as Default'),
        content: const Text(
          'This will make this payment method your default option for all transactions. Continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: SafeJetColors.secondaryHighlight,
              foregroundColor: Colors.black,
            ),
            child: const Text('Set as Default'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      setState(() => _isDefault = true);
    }
  }
} 