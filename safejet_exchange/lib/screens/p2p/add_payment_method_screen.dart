import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../models/payment_method_type.dart';
import '../../providers/payment_methods_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import '../../widgets/payment_method_type_picker.dart';
import '../../providers/auth_provider.dart';
import 'dart:convert';
import '../../models/payment_method_field.dart';

class AddPaymentMethodScreen extends StatefulWidget {
  const AddPaymentMethodScreen({
    super.key,
  });

  @override
  State<AddPaymentMethodScreen> createState() => _AddPaymentMethodScreenState();
}

class _AddPaymentMethodScreenState extends State<AddPaymentMethodScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  bool _isDefault = false;
  bool _isLoading = false;
  Map<String, TextEditingController> _detailControllers = {};
  PaymentMethodType? _selectedType;

  @override
  void initState() {
    super.initState();
    // Load user data when screen initializes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AuthProvider>(context, listen: false).loadUserData();
    });
  }

  @override
  Widget build(BuildContext context) {
    // Get isDark directly from Theme
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      backgroundColor: isDark 
          ? SafeJetColors.darkGradientStart
          : SafeJetColors.lightGradientStart,
      appBar: P2PAppBar(
        title: 'Add Payment Method',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: Consumer<PaymentMethodsProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [



 // Payment Method Type Section
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: SafeJetColors.primaryAccent.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: SafeJetColors.primaryAccent.withOpacity(0.2),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Payment Method Type',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 16),
                        InkWell(
                          onTap: () {
                            showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (context) => PaymentMethodTypePicker(
                                types: provider.paymentMethodTypes,
                                isDark: isDark,
                                onSelect: (type) {
                                  setState(() {
                                    _selectedType = type;
                                    _detailControllers = {};
                                    for (var field in type.fields) {
                                      _detailControllers[field.name] = TextEditingController();
                                    }
                                  });
                                },
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: isDark 
                                  ? Colors.white.withOpacity(0.05)
                                  : Colors.black.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                if (_selectedType != null) ...[
                                  Icon(
                                    _getIconData(_selectedType!.icon),
                                    color: isDark ? Colors.white70 : Colors.black87,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      _selectedType!.name,
                                      style: TextStyle(
                                        fontSize: 16,
                                        color: isDark ? Colors.white : Colors.black,
                                      ),
                                    ),
                                  ),
                                ] else
                                  Text(
                                    'Select payment method type',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: isDark 
                                          ? Colors.white.withOpacity(0.5)
                                          : Colors.black.withOpacity(0.5),
                                    ),
                                  ),
                                const Icon(Icons.arrow_drop_down),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),



                  // Name Field Section (Always visible)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: SafeJetColors.primaryAccent.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: SafeJetColors.primaryAccent.withOpacity(0.2),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Account Name',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'This payment method will be registered under your name',
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark 
                                ? Colors.white.withOpacity(0.7)
                                : Colors.black.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Consumer<AuthProvider>(
                          builder: (context, authProvider, _) {
                            print('AuthProvider state: ${authProvider.toString()}');
                            print('User object: ${authProvider.user}');
                            print('User fullName: ${authProvider.user?.fullName}');

                            final fullName = authProvider.user?.fullName ?? '';
                            _nameController.text = fullName;
                            
                            return TextFormField(
                              controller: _nameController,
                              enabled: false,
                              style: TextStyle(
                                fontSize: 16,
                                color: isDark ? Colors.white : Colors.black,
                              ),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: isDark 
                                    ? Colors.white.withOpacity(0.05)
                                    : Colors.black.withOpacity(0.05),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 16,
                                ),
                                prefixIcon: Icon(
                                  Icons.person_outline,
                                  color: isDark 
                                      ? Colors.white.withOpacity(0.7)
                                      : Colors.black.withOpacity(0.7),
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                 
                  // Payment Method Details
                  if (_selectedType != null) ...[
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: SafeJetColors.primaryAccent.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: SafeJetColors.primaryAccent.withOpacity(0.2),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Payment Method Details',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white : Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ..._selectedType!.fields.map((field) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: _buildInputField(
                                controller: _detailControllers[field.name]!,
                                label: field.label,
                                hint: field.placeholder ?? 'Enter ${field.label.toLowerCase()}',
                                isDark: isDark,
                                validationRules: field.validationRules,
                              ),
                            );
                          }).toList(),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Set as Default Option
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      decoration: BoxDecoration(
                        color: SafeJetColors.primaryAccent.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: SafeJetColors.primaryAccent.withOpacity(0.2),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Set as Default',
                            style: TextStyle(
                              fontSize: 16,
                              color: isDark ? Colors.white : Colors.black87,
                            ),
                          ),
                          Switch(
                            value: _isDefault,
                            onChanged: _handleDefaultToggle,
                            activeColor: SafeJetColors.secondaryHighlight,
                            inactiveTrackColor: Colors.grey.withOpacity(0.3),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            height: 56,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: SafeJetColors.secondaryHighlight,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                      ),
                    )
                  : const Text(
                      'Add Payment Method',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required bool isDark,
    Map<String, dynamic>? validationRules,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: isDark ? Colors.white70 : Colors.black87,
          ),
        ),
        TextFormField(
          controller: controller,
          style: TextStyle(
            fontSize: 16,
            color: isDark ? Colors.white : Colors.black,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: isDark 
                  ? Colors.white.withOpacity(0.3)
                  : Colors.black.withOpacity(0.3),
            ),
            filled: true,
            fillColor: isDark 
                ? Colors.white.withOpacity(0.05)
                : Colors.black.withOpacity(0.05),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
          ),
          validator: (value) {
            if (validationRules?['required'] == true && (value?.isEmpty ?? true)) {
              return 'Please enter $label';
            }
            if (value != null && value.isNotEmpty) {
              final minLength = validationRules?['minLength'] as int?;
              if (minLength != null && value.length < minLength) {
                return '$label must be at least $minLength characters';
              }
              
              final maxLength = validationRules?['maxLength'] as int?;
              if (maxLength != null && value.length > maxLength) {
                return '$label must not exceed $maxLength characters';
              }
              
              final pattern = validationRules?['pattern'] as String?;
              if (pattern != null && !RegExp(pattern).hasMatch(value)) {
                return '$label format is invalid';
              }
            }
            return null;
          },
        ),
      ],
    );
  }

  void _handleSubmit() async {
    if (_formKey.currentState?.validate() ?? false) {
      try {
        setState(() => _isLoading = true);
        
        final details = <String, dynamic>{};
        
        for (var field in _selectedType!.fields) {
          final controller = _detailControllers[field.name];
          if (controller != null) {
            details[field.name] = {
              'value': controller.text,
              'fieldId': field.id,
              'fieldType': field.type,
              'fieldName': field.name,
            };
          }
        }

        final data = {
          'isDefault': _isDefault,
          'paymentMethodTypeId': _selectedType?.id,
          'details': details,
        };

        await Provider.of<PaymentMethodsProvider>(context, listen: false)
            .createPaymentMethod(data);

        if (!mounted) return;

        // Show success message and navigate back
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 8),
                Text('Payment method added successfully'),
              ],
            ),
            backgroundColor: SafeJetColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );

        Navigator.pop(context);
      } catch (e) {
        if (!mounted) return;
        
        // Show error message but don't navigate
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(child: Text(e.toString())),
              ],
            ),
            backgroundColor: SafeJetColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } finally {
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
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

  IconData _getIconData(String iconString) {
    switch (iconString) {
      case 'account_balance':
        return Icons.account_balance;
      case 'payment':
        return Icons.payment;
      case 'attach_money':
        return Icons.attach_money;
      case 'mobile_friendly':
        return Icons.mobile_friendly;
      case 'currency_exchange':
        return Icons.currency_exchange;
      default:
        return Icons.account_balance; // default icon
    }
  }

  // Update _buildFieldInput to handle more types
  Widget _buildFieldInput(PaymentMethodField field) {
    switch (field.type.toLowerCase()) {
      case 'image':
        return _buildImageInput(field);
      case 'select':
        return _buildSelectInput(field);
      case 'date':
        return _buildDateInput(field);
      case 'number':
        return _buildNumberInput(field);
      case 'phone':
        return _buildPhoneInput(field);
      case 'email':
        return _buildEmailInput(field);
      case 'text':
      default:
        return _buildTextInput(field);
    }
  }

  // Add new field type widgets
  Widget _buildDateInput(PaymentMethodField field) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(field.label),
        const SizedBox(height: 8),
        TextFormField(
          controller: _detailControllers[field.name],
          readOnly: true,
          decoration: InputDecoration(
            hintText: field.placeholder ?? 'Select date',
            suffixIcon: const Icon(Icons.calendar_today),
          ),
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: DateTime.now(),
              firstDate: DateTime(1900),
              lastDate: DateTime.now(),
            );
            if (date != null) {
              _detailControllers[field.name]?.text = date.toIso8601String().split('T')[0];
            }
          },
          validator: field.isRequired ? (value) {
            if (value?.isEmpty ?? true) return '${field.label} is required';
            return null;
          } : null,
        ),
      ],
    );
  }

  Widget _buildNumberInput(PaymentMethodField field) {
    final min = field.validationRules?['min'] as num?;
    final max = field.validationRules?['max'] as num?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(field.label),
        const SizedBox(height: 8),
        TextFormField(
          controller: _detailControllers[field.name],
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: field.placeholder ?? 'Enter ${field.label.toLowerCase()}',
          ),
          validator: (value) {
            if (field.isRequired && (value?.isEmpty ?? true)) {
              return '${field.label} is required';
            }
            if (value != null && value.isNotEmpty) {
              final number = num.tryParse(value);
              if (number == null) {
                return 'Please enter a valid number';
              }
              if (min != null && number < min) {
                return '${field.label} must be at least $min';
              }
              if (max != null && number > max) {
                return '${field.label} must not exceed $max';
              }
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildPhoneInput(PaymentMethodField field) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(field.label),
        const SizedBox(height: 8),
        TextFormField(
          controller: _detailControllers[field.name],
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            hintText: field.placeholder ?? 'Enter phone number',
            prefixIcon: const Icon(Icons.phone),
          ),
          validator: (value) {
            if (field.isRequired && (value?.isEmpty ?? true)) {
              return '${field.label} is required';
            }
            if (value != null && value.isNotEmpty) {
              // Basic phone number validation
              if (!RegExp(r'^\+?[\d\s-]+$').hasMatch(value)) {
                return 'Please enter a valid phone number';
              }
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildEmailInput(PaymentMethodField field) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(field.label),
        const SizedBox(height: 8),
        TextFormField(
          controller: _detailControllers[field.name],
          keyboardType: TextInputType.emailAddress,
          decoration: InputDecoration(
            hintText: field.placeholder ?? 'Enter email address',
            prefixIcon: const Icon(Icons.email),
          ),
          validator: (value) {
            if (field.isRequired && (value?.isEmpty ?? true)) {
              return '${field.label} is required';
            }
            if (value != null && value.isNotEmpty) {
              // Email validation
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                return 'Please enter a valid email address';
              }
            }
            return null;
          },
        ),
      ],
    );
  }

  // Update _buildTextInput to handle multiline text
  Widget _buildTextInput(PaymentMethodField field) {
    final maxLines = field.validationRules?['maxLines'] as int? ?? 1;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(field.label),
        const SizedBox(height: 8),
        TextFormField(
          controller: _detailControllers[field.name],
          maxLines: maxLines,
          decoration: InputDecoration(
            hintText: field.placeholder ?? 'Enter ${field.label.toLowerCase()}',
          ),
          validator: (value) {
            if (field.isRequired && (value?.isEmpty ?? true)) {
              return '${field.label} is required';
            }
            // Add any additional validation from validationRules
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildImageInput(PaymentMethodField field) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(field.label),
        const SizedBox(height: 8),
        TextFormField(
          controller: _detailControllers[field.name],
          readOnly: true,
          decoration: InputDecoration(
            hintText: field.placeholder ?? 'Select image',
            suffixIcon: const Icon(Icons.image),
          ),
          onTap: () async {
            // TODO: Implement image picking
          },
        ),
      ],
    );
  }

  Widget _buildSelectInput(PaymentMethodField field) {
    final options = field.validationRules?['options'] as List<dynamic>?;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(field.label),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          decoration: InputDecoration(
            hintText: field.placeholder ?? 'Select ${field.label.toLowerCase()}',
          ),
          value: _detailControllers[field.name]?.text.isEmpty ?? true 
              ? null 
              : _detailControllers[field.name]?.text,
          items: options?.map((option) {
            final value = option['value'].toString();
            final label = option['label'].toString();
            return DropdownMenuItem(value: value, child: Text(label));
          }).toList() ?? [],
          onChanged: (value) {
            _detailControllers[field.name]?.text = value ?? '';
          },
          validator: field.isRequired ? (value) {
            if (value?.isEmpty ?? true) return '${field.label} is required';
            return null;
          } : null,
        ),
      ],
    );
  }
} 