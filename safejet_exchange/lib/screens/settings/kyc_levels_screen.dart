import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import 'identity_verification_screen.dart';
import '../../providers/kyc_provider.dart';
import '../../models/kyc_level.dart';
import 'phone_verification_screen.dart';

class KYCLevelsScreen extends StatefulWidget {
  const KYCLevelsScreen({super.key});

  @override
  State<KYCLevelsScreen> createState() => _KYCLevelsScreenState();
}

class _KYCLevelsScreenState extends State<KYCLevelsScreen> {
  @override
  void initState() {
    super.initState();
    // Schedule loading KYC levels after the build is complete
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<KYCProvider>().loadKYCLevels();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Verification Levels',
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
              child: Column(
                children: [
                  _buildCurrentLevel(isDark),
                  const SizedBox(height: 24),
                  _buildLevelsList(context, isDark),
                ],
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
              Icons.verified_user,
              color: SafeJetColors.secondaryHighlight,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Verification Levels',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Unlock higher limits and features',
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

  Widget _buildCurrentLevel(bool isDark) {
    return Consumer<KYCProvider>(
      builder: (context, kycProvider, child) {
        final kycDetails = kycProvider.kycDetails;
        final currentLevel = kycDetails?.currentLevel ?? 0;
        final nextLevel = currentLevel + 1;
        return FadeInUp(
          duration: const Duration(milliseconds: 300),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  SafeJetColors.secondaryHighlight,
                  SafeJetColors.secondaryHighlight.withOpacity(0.8),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.stars,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Current Level',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          'Level $currentLevel',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: currentLevel / 3,
                    backgroundColor: Colors.white.withOpacity(0.2),
                    valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                    minHeight: 8,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  currentLevel < 3 
                      ? 'Complete identity verification to reach Level $nextLevel'
                      : 'Maximum level reached',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildLevelsList(BuildContext context, bool isDark) {
    return Consumer<KYCProvider>(
      builder: (context, kycProvider, child) {
        if (kycProvider.loading) {
          return const Center(child: CircularProgressIndicator());
        }

        final levels = kycProvider.kycLevels;
        if (levels == null) {
          return const Center(child: Text('Unable to load KYC levels'));
        }

        return Column(
          children: levels.map((level) => FadeInUp(
            duration: const Duration(milliseconds: 300),
            delay: Duration(milliseconds: level.level * 100),
            child: _buildLevelCard(context, level, isDark),
          )).toList(),
        );
      },
    );
  }

  Widget _buildLevelCard(BuildContext context, KYCLevel level, bool isDark) {
    Color levelColor = _getLevelColor(level.level);
    String status = _getLevelStatus(level.level);
    final currentLevel = context.read<KYCProvider>().kycDetails?.currentLevel ?? 0;
    final isNextLevel = level.level == currentLevel + 1;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: levelColor.withOpacity(0.3),
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: levelColor.withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: levelColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Level ${level.level}',
                    style: TextStyle(
                      color: levelColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  level.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _getStatusColor(status).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(
                      color: _getStatusColor(status),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Requirements',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 8),
                ...level.requirements.map((req) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Icon(
                        _isRequirementCompleted(req)
                            ? Icons.check_circle
                            : Icons.radio_button_unchecked,
                        size: 16,
                        color: _isRequirementCompleted(req)
                            ? SafeJetColors.success
                            : Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Text(req),
                    ],
                  ),
                )),
                const SizedBox(height: 16),
                Text(
                  'Benefits',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 8),
                ...level.benefits.map((benefit) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Icon(
                        Icons.check,
                        size: 16,
                        color: levelColor,
                      ),
                      const SizedBox(width: 8),
                      Text(benefit),
                    ],
                  ),
                )),
                if (isNextLevel) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        final nextStep = _getNextVerificationStep(level.level);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => nextStep,
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: levelColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        'Complete Verification',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getLevelColor(int level) {
    switch (level) {
      case 0:
        return Colors.grey;
      case 1:
        return SafeJetColors.warning;
      case 2:
        return SafeJetColors.secondaryHighlight;
      case 3:
        return SafeJetColors.success;
      default:
        return Colors.grey;
    }
  }

  String _getLevelStatus(int level) {
    // Get current level from KYC provider
    final currentLevel = context.read<KYCProvider>().kycDetails?.currentLevel ?? 0;
    
    switch (level) {
      case 0:
        return 'Completed';
      case _ when level <= currentLevel:
        return 'Completed';
      case _ when level == currentLevel + 1:
        return 'In Progress';
      default:
        return 'Locked';
    }
  }

  bool _isLevelCompleted(int level) {
    // Get current level from KYC provider
    final currentLevel = context.read<KYCProvider>().kycDetails?.currentLevel ?? 0;
    return level <= currentLevel;
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'In Progress':
        return SafeJetColors.secondaryHighlight;
      case 'Locked':
        return Colors.grey;
      default:
        return SafeJetColors.success;
    }
  }

  bool _isRequirementCompleted(String requirement) {
    final kycDetails = context.read<KYCProvider>().kycDetails;
    if (kycDetails == null) return false;

    switch (requirement.toLowerCase()) {
      case 'email verification':
        return kycDetails.userDetails.emailVerified;
      case 'phone verification':
        return kycDetails.userDetails.phoneVerified;
      case 'identity verification':
      case 'address proof':
        return kycDetails.kycData?['identityVerified'] == true;
      default:
        return false;
    }
  }

  Widget _getNextVerificationStep(int level) {
    switch (level) {
      case 1:
        return const PhoneVerificationScreen();  // For Level 1
      case 2:
        return const IdentityVerificationScreen();  // For Level 2
      default:
        return const IdentityVerificationScreen();
    }
  }

  Widget _buildVerificationButton(BuildContext context, int currentLevel) {
    final kycProvider = Provider.of<KYCProvider>(context);
    
    if (currentLevel >= 2) return const SizedBox.shrink();

    return ElevatedButton(
      onPressed: kycProvider.loading 
        ? null 
        : () async {
            try {
              await kycProvider.startKYCVerification();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Verification completed successfully'),
                    backgroundColor: Colors.green,
                  ),
                );
              }
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Verification failed: $e'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            }
          },
      child: Text(
        kycProvider.loading ? 'Verifying...' : 'Start Verification',
        style: TextStyle(color: Colors.white),
      ),
    );
  }
} 