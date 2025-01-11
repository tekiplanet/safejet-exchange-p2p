import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../models/payment_method_type.dart';
import '../../providers/payment_methods_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import '../../widgets/payment_method_type_picker.dart';
import '../../providers/auth_provider.dart';

class AddPaymentMethodScreen extends StatefulWidget {
  final bool isDark;
  
  const AddPaymentMethodScreen({
    super.key,
    required this.isDark,
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
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      backgroundColor: widget.isDark 
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
                            color: widget.isDark ? Colors.white : Colors.black87,
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
                                isDark: widget.isDark,
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
                              color: widget.isDark 
                                  ? Colors.white.withOpacity(0.05)
                                  : Colors.black.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                if (_selectedType != null) ...[
                                  Icon(
                                    _getIconData(_selectedType!.icon),
                                    color: widget.isDark ? Colors.white70 : Colors.black87,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      _selectedType!.name,
                                      style: TextStyle(
                                        fontSize: 16,
                                        color: widget.isDark ? Colors.white : Colors.black,
                                      ),
                                    ),
                                  ),
                                ] else
                                  Text(
                                    'Select payment method type',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: widget.isDark 
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
                            color: widget.isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'This payment method will be registered under your name',
                          style: TextStyle(
                            fontSize: 14,
                            color: widget.isDark 
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
                                color: widget.isDark ? Colors.white : Colors.black,
                              ),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: widget.isDark 
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
                                  color: widget.isDark 
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
                              color: widget.isDark ? Colors.white : Colors.black87,
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
                              color: widget.isDark ? Colors.white : Colors.black87,
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
    Map<String, dynamic>? validationRules,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: widget.isDark ? Colors.white70 : Colors.black87,
            ),
          ),
        ),
        TextFormField(
          controller: controller,
          style: TextStyle(
            fontSize: 16,
            color: widget.isDark ? Colors.white : Colors.black,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: widget.isDark 
                  ? Colors.white.withOpacity(0.3)
                  : Colors.black.withOpacity(0.3),
            ),
            filled: true,
            fillColor: widget.isDark 
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

  void _handleSubmit() {
    if (_formKey.currentState?.validate() ?? false) {
      final data = {
        'name': _nameController.text,
        'isDefault': _isDefault,
        'paymentMethodTypeId': _selectedType?.id,
        'details': _details,
      };
      Navigator.pop(context, data);
    }
  }

  Map<String, dynamic> get _details {
    final details = <String, dynamic>{};
    _detailControllers.forEach((key, controller) {
      details[key] = controller.text;
    });
    return details;
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
} 