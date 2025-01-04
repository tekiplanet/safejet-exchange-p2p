import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import 'email_verification_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _resetPassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    
    // TODO: Implement actual password reset logic
    await Future.delayed(const Duration(seconds: 2));
    
    if (!mounted) return;
    
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EmailVerificationScreen(
          email: _emailController.text,
        ),
      ),
    );

    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        height: MediaQuery.of(context).size.height,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              SafeJetColors.primaryBackground,
              SafeJetColors.secondaryBackground,
            ],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 20),
                  FadeInLeft(
                    duration: const Duration(milliseconds: 600),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  const SizedBox(height: 40),
                  FadeInDown(
                    duration: const Duration(milliseconds: 800),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Forgot Password?',
                          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                            color: SafeJetColors.textHighlight,
                            fontSize: 36,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Enter your email to reset your password',
                          style: TextStyle(color: Colors.grey[400]),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                  FadeInUp(
                    duration: const Duration(milliseconds: 800),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        children: [
                          _buildEmailField(),
                          const SizedBox(height: 32),
                          _buildResetButton(),
                          const SizedBox(height: 24),
                          _buildLoginLink(),
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
    );
  }

  Widget _buildEmailField() {
    return Container(
      decoration: BoxDecoration(
        color: SafeJetColors.primaryAccent.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: SafeJetColors.primaryAccent.withOpacity(0.2),
        ),
      ),
      child: TextFormField(
        controller: _emailController,
        keyboardType: TextInputType.emailAddress,
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          labelText: 'Email',
          labelStyle: TextStyle(color: Colors.grey[400]),
          prefixIcon: Icon(
            Icons.email_outlined,
            color: SafeJetColors.secondaryHighlight,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(16),
        ),
        validator: (value) {
          if (value == null || value.isEmpty) {
            return 'Please enter your email';
          }
          if (!value.contains('@')) {
            return 'Please enter a valid email';
          }
          return null;
        },
      ),
    );
  }

  Widget _buildResetButton() {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _resetPassword,
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
                'Reset Password',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: SafeJetColors.primaryBackground,
                ),
              ),
      ),
    );
  }

  Widget _buildLoginLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Remember your password? ',
          style: TextStyle(color: Colors.grey[400]),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Login',
            style: TextStyle(
              color: SafeJetColors.secondaryHighlight,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }
} 