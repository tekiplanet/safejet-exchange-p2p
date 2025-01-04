import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import 'identity_verification_screen.dart';

class KYCLevelsScreen extends StatelessWidget {
  const KYCLevelsScreen({super.key});

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
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Current Level',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      'Level 1',
                      style: TextStyle(
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
                value: 0.33,
                backgroundColor: Colors.white.withOpacity(0.2),
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                minHeight: 8,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Complete identity verification to reach Level 2',
              style: TextStyle(
                color: Colors.white,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLevelsList(BuildContext context, bool isDark) {
    final levels = [
      {
        'level': 1,
        'title': 'Basic',
        'status': 'Current',
        'requirements': ['Email verification', 'Phone verification'],
        'benefits': [
          'Deposit crypto',
          'Withdraw up to \$1,000/day',
          'Basic trading features',
        ],
        'color': SafeJetColors.warning,
        'isCompleted': true,
      },
      {
        'level': 2,
        'title': 'Verified',
        'status': 'In Progress',
        'requirements': ['Identity verification', 'Address proof'],
        'benefits': [
          'Withdraw up to \$50,000/day',
          'P2P trading',
          'Fiat deposits',
        ],
        'color': SafeJetColors.secondaryHighlight,
        'isCompleted': false,
      },
      {
        'level': 3,
        'title': 'Advanced',
        'status': 'Locked',
        'requirements': ['Advanced verification', 'Video call verification'],
        'benefits': [
          'Unlimited withdrawals',
          'VIP support',
          'Lower trading fees',
          'Higher leverage',
        ],
        'color': SafeJetColors.success,
        'isCompleted': false,
      },
    ];

    return Column(
      children: levels.map((level) => FadeInUp(
        duration: const Duration(milliseconds: 300),
        delay: Duration(milliseconds: (level['level'] as int) * 100),
        child: _buildLevelCard(context, level, isDark),
      )).toList(),
    );
  }

  Widget _buildLevelCard(BuildContext context, Map<String, dynamic> level, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: (level['color'] as Color).withOpacity(0.3),
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: (level['color'] as Color).withOpacity(0.1),
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
                    color: (level['color'] as Color).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Level ${level['level']}',
                    style: TextStyle(
                      color: level['color'] as Color,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  level['title'] as String,
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
                    color: _getStatusColor(level['status'] as String).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    level['status'] as String,
                    style: TextStyle(
                      color: _getStatusColor(level['status'] as String),
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
                ...(level['requirements'] as List).map((req) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Icon(
                        level['isCompleted'] as bool
                            ? Icons.check_circle
                            : Icons.radio_button_unchecked,
                        size: 16,
                        color: level['isCompleted'] as bool
                            ? SafeJetColors.success
                            : Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Text(req as String),
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
                ...(level['benefits'] as List).map((benefit) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Icon(
                        Icons.check,
                        size: 16,
                        color: level['color'] as Color,
                      ),
                      const SizedBox(width: 8),
                      Text(benefit as String),
                    ],
                  ),
                )),
                if (level['status'] == 'In Progress') ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const IdentityVerificationScreen(),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: level['color'] as Color,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: const Text('Complete Verification'),
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

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Current':
        return SafeJetColors.warning;
      case 'In Progress':
        return SafeJetColors.secondaryHighlight;
      case 'Locked':
        return Colors.grey;
      default:
        return SafeJetColors.success;
    }
  }
} 