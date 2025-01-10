import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/two_factor_dialog.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _showCurrentPassword = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;
  bool _isLoading = false;

  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    // Load user data if not already loaded
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (authProvider.user == null) {
      authProvider.loadUser();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Change Password',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: Column(
        children: [
          _buildHeader(isDark),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    FadeInUp(
                      duration: const Duration(milliseconds: 300),
                      child: _buildPasswordField(
                        controller: _currentPasswordController,
                        label: 'Current Password',
                        showPassword: _showCurrentPassword,
                        onToggleVisibility: () {
                          setState(() => _showCurrentPassword = !_showCurrentPassword);
                        },
                        isDark: isDark,
                      ),
                    ),
                    const SizedBox(height: 20),
                    FadeInUp(
                      duration: const Duration(milliseconds: 300),
                      delay: const Duration(milliseconds: 100),
                      child: _buildPasswordField(
                        controller: _newPasswordController,
                        label: 'New Password',
                        showPassword: _showNewPassword,
                        onToggleVisibility: () {
                          setState(() => _showNewPassword = !_showNewPassword);
                        },
                        isDark: isDark,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter a new password';
                          }
                          if (value.length < 8) {
                            return 'Password must be at least 8 characters';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(height: 20),
                    FadeInUp(
                      duration: const Duration(milliseconds: 300),
                      delay: const Duration(milliseconds: 200),
                      child: _buildPasswordField(
                        controller: _confirmPasswordController,
                        label: 'Confirm New Password',
                        showPassword: _showConfirmPassword,
                        onToggleVisibility: () {
                          setState(() => _showConfirmPassword = !_showConfirmPassword);
                        },
                        isDark: isDark,
                        validator: (value) {
                          if (value != _newPasswordController.text) {
                            return 'Passwords do not match';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(height: 32),
                    FadeInUp(
                      duration: const Duration(milliseconds: 300),
                      delay: const Duration(milliseconds: 300),
                      child: _buildPasswordRequirements(isDark),
                    ),
                    const SizedBox(height: 32),
                    FadeInUp(
                      duration: const Duration(milliseconds: 300),
                      delay: const Duration(milliseconds: 400),
                      child: SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleChangePassword,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: SafeJetColors.secondaryHighlight,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 0,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Text(
                                  'Change Password',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: const BorderRadius.vertical(
          bottom: Radius.circular(24),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: SafeJetColors.secondaryHighlight.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.lock_outline,
              color: SafeJetColors.secondaryHighlight,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Change Password',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Keep your account secure',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String label,
    required bool showPassword,
    required Function() onToggleVisibility,
    required bool isDark,
    String? Function(String?)? validator,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: TextFormField(
        controller: controller,
        obscureText: !showPassword,
        validator: validator,
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.transparent,
          suffixIcon: IconButton(
            icon: Icon(
              showPassword ? Icons.visibility_off : Icons.visibility,
              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
            ),
            onPressed: onToggleVisibility,
          ),
        ),
      ),
    );
  }

  Widget _buildPasswordRequirements(bool isDark) {
    final requirements = [
      'At least 8 characters',
      'One uppercase letter',
      'One lowercase letter',
      'One number',
      'One special character',
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Password Requirements',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.grey[300] : Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          ...requirements.map((req) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Icon(
                      Icons.check_circle_outline,
                      size: 16,
                      color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      req,
                      style: TextStyle(
                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  void _handleChangePassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      
      // First verify current password
      final isCurrentPasswordValid = await authProvider.verifyCurrentPassword(
        _currentPasswordController.text
      );
      
      if (!isCurrentPasswordValid) {
        throw Exception('Current password is incorrect');
      }

      // If 2FA is enabled, show verification dialog
      if (authProvider.user?.twoFactorEnabled == true) {
        if (!mounted) return;
        
        final verified = await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (context) => const TwoFactorDialog(
            action: 'changePassword',
            title: 'Verify 2FA',
            message: 'Enter the 6-digit code to change password',
          ),
        );
        
        if (verified != true) {
          throw Exception('2FA verification failed');
        }
      }

      // Change password
      await authProvider.changePassword(
        currentPassword: _currentPasswordController.text,
        newPassword: _newPasswordController.text,
      );

      if (!mounted) return;
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password changed successfully'),
          backgroundColor: SafeJetColors.success,
        ),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: SafeJetColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
} 