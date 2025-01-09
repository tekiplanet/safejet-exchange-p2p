import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/kyc_provider.dart';
import '../../widgets/verification_status_card.dart';
import '../../config/theme/colors.dart';
import '../../widgets/p2p_app_bar.dart';
import '../../config/theme/theme_provider.dart';

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
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: SafeJetColors.error,
            behavior: SnackBarBehavior.floating,
          ),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      backgroundColor: isDark ? SafeJetColors.primaryBackground : SafeJetColors.lightBackground,
      appBar: P2PAppBar(
        title: 'Advanced Verification',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const VerificationStatusCard(type: 'Advanced'),
            const SizedBox(height: 24),
            Card(
              color: isDark ? SafeJetColors.primaryAccent.withOpacity(0.1) : SafeJetColors.lightCardBackground,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(
                  color: isDark 
                      ? SafeJetColors.primaryAccent.withOpacity(0.2)
                      : SafeJetColors.lightCardBorder,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Required Documents',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildRequirementItem(
                      'Bank Statement (Last 3 months)',
                      'Recent bank statements showing your financial activity',
                      Icons.account_balance,
                    ),
                    const SizedBox(height: 12),
                    _buildRequirementItem(
                      'Proof of Income',
                      'Salary slips, tax returns, or other income proof',
                      Icons.description,
                    ),
                    const SizedBox(height: 12),
                    _buildRequirementItem(
                      'Tax Documents',
                      'Recent tax returns or tax assessment documents',
                      Icons.folder,
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _startAdvancedVerification,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: SafeJetColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: _loading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Text(
                                'Start Verification',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRequirementItem(String title, String description, IconData icon) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: SafeJetColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: SafeJetColors.primary,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                description,
                style: TextStyle(
                  color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
} 