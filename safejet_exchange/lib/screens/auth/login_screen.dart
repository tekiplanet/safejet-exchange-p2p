import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import 'registration_screen.dart';
import 'forgot_password_screen.dart';
import '../main/home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isPasswordVisible = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: SingleChildScrollView(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: MediaQuery.of(context).size.height,
          ),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: isDark
                    ? [
                        SafeJetColors.darkGradientStart,
                        SafeJetColors.darkGradientEnd,
                      ]
                    : [
                        SafeJetColors.lightGradientStart,
                        SafeJetColors.lightGradientEnd,
                      ],
              ),
            ),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 40),
                    // Logo and Welcome Text
                    FadeInDown(
                      duration: const Duration(milliseconds: 800),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome Back',
                            style: theme.textTheme.headlineLarge,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Sign in to continue',
                            style: theme.textTheme.bodyLarge,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 40),
                    // Login Form
                    FadeInUp(
                      duration: const Duration(milliseconds: 800),
                      delay: const Duration(milliseconds: 400),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          children: [
                            // Email Field
                            _buildTextField(
                              controller: _emailController,
                              label: 'Email',
                              hint: 'Enter your email',
                            ),
                            const SizedBox(height: 20),
                            // Password Field
                            _buildTextField(
                              controller: _passwordController,
                              label: 'Password',
                              hint: 'Enter your password',
                              isPassword: true,
                            ),
                            const SizedBox(height: 12),
                            // Forgot Password
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => const ForgotPasswordScreen(),
                                    ),
                                  );
                                },
                                child: Text(
                                  'Forgot Password?',
                                  style: TextStyle(
                                    color: SafeJetColors.secondaryHighlight,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 32),
                            // Login Button
                            _buildLoginButton(),
                            const SizedBox(height: 24),
                            // Or Divider
                            Row(
                              children: [
                                Expanded(child: Divider(color: Colors.grey[700])),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  child: Text(
                                    'Or continue with',
                                    style: TextStyle(color: Colors.grey[400]),
                                  ),
                                ),
                                Expanded(child: Divider(color: Colors.grey[700])),
                              ],
                            ),
                            const SizedBox(height: 24),
                            // Social Login Buttons
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                _buildSocialButton(
                                  icon: Icons.g_mobiledata_rounded,
                                  onPressed: () {
                                    // TODO: Implement Google login
                                  },
                                ),
                                _buildSocialButton(
                                  icon: Icons.apple_rounded,
                                  onPressed: () {
                                    // TODO: Implement Apple login
                                  },
                                ),
                                _buildSocialButton(
                                  icon: Icons.facebook_rounded,
                                  onPressed: () {
                                    // TODO: Implement Facebook login
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),
                            // Sign Up Link
                            _buildSignUpLink(),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    bool isPassword = false,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.bodyLarge,
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: isDark
                ? SafeJetColors.primaryAccent.withOpacity(0.1)
                : SafeJetColors.lightCardBackground,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark
                  ? SafeJetColors.primaryAccent.withOpacity(0.2)
                  : SafeJetColors.lightCardBorder,
            ),
          ),
          child: TextFormField(
            controller: controller,
            obscureText: isPassword && !_isPasswordVisible,
            style: theme.textTheme.bodyLarge,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: theme.textTheme.bodyMedium,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(16),
              suffixIcon: isPassword
                  ? IconButton(
                      icon: Icon(
                        _isPasswordVisible
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: isDark ? Colors.white70 : Colors.grey,
                      ),
                      onPressed: () {
                        setState(() {
                          _isPasswordVisible = !_isPasswordVisible;
                        });
                      },
                    )
                  : null,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLoginButton() {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading
            ? null
            : () async {
                if (_formKey.currentState!.validate()) {
                  setState(() => _isLoading = true);
                  // TODO: Implement actual login logic
                  await Future.delayed(const Duration(seconds: 2));
                  if (mounted) {
                    // Replace the entire navigation stack with the home screen
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                        builder: (context) => const HomeScreen(),
                      ),
                    );
                  }
                  setState(() => _isLoading = false);
                }
              },
        style: ElevatedButton.styleFrom(
          backgroundColor: SafeJetColors.secondaryHighlight,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
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
                'Login',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: SafeJetColors.primaryBackground,
                ),
              ),
      ),
    );
  }

  Widget _buildSignUpLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Don\'t have an account? ',
          style: TextStyle(color: Colors.grey[400]),
        ),
        TextButton(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const RegistrationScreen(),
              ),
            );
          },
          child: Text(
            'Sign Up',
            style: TextStyle(
              color: SafeJetColors.secondaryHighlight,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSocialButton({
    required IconData icon,
    required VoidCallback onPressed,
  }) {
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        color: SafeJetColors.primaryAccent.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: SafeJetColors.primaryAccent.withOpacity(0.2),
        ),
      ),
      child: IconButton(
        icon: Icon(icon, color: Colors.white, size: 30),
        onPressed: onPressed,
      ),
    );
  }
} 