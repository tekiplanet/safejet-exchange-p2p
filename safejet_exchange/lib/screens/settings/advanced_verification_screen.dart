import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/kyc_provider.dart';
import '../../widgets/verification_status_card.dart';
// ... other imports

class AdvancedVerificationScreen extends StatefulWidget {
  const AdvancedVerificationScreen({super.key});

  @override
  State<AdvancedVerificationScreen> createState() => _AdvancedVerificationScreenState();
}

class _AdvancedVerificationScreenState extends State<AdvancedVerificationScreen> {
  bool _loading = false;

  Future<void> _startAdvancedVerification() async {
    try {
      setState(() => _loading = true);
      await context.read<KYCProvider>().startAdvancedVerification();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Advanced Verification')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const VerificationStatusCard(type: 'Advanced'),
            const SizedBox(height: 24),
            // ... rest of the UI similar to identity_verification_screen.dart
          ],
        ),
      ),
    );
  }
} 