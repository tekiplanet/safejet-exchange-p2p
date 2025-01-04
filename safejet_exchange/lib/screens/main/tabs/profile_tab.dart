import 'package:flutter/material.dart';
import '../../../config/theme/colors.dart';
import 'package:provider/provider.dart';
import '../../../config/theme/theme_provider.dart';
import '../../../services/biometric_service.dart';
import '../../../screens/p2p/p2p_payment_methods_screen.dart';
import '../../../screens/p2p/p2p_trading_preferences_screen.dart';
import '../../../screens/p2p/p2p_auto_response_screen.dart';
import '../../../screens/settings/notification_settings_screen.dart';
import '../../../screens/settings/change_password_screen.dart';
import '../../../screens/settings/two_factor_screen.dart';
import '../../../screens/settings/identity_verification_screen.dart';
import '../../../screens/settings/kyc_levels_screen.dart';
import 'package:animate_do/animate_do.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? SafeJetColors.primaryBackground : SafeJetColors.lightBackground,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Profile Header with animation
              FadeInDown(
                duration: const Duration(milliseconds: 400),
                child: Row(
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          'JD',
                          style: theme.textTheme.headlineMedium?.copyWith(
                            color: SafeJetColors.secondaryHighlight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'John Doe',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'john.doe@example.com',
                            style: TextStyle(
                              color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: SafeJetColors.warning.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: GestureDetector(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const KYCLevelsScreen(),
                                  ),
                                );
                              },
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'Level 1',
                                    style: TextStyle(
                                      color: SafeJetColors.warning,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Icon(
                                    Icons.arrow_forward_ios,
                                    size: 12,
                                    color: SafeJetColors.warning,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Security Settings Section
              FadeInUp(
                duration: const Duration(milliseconds: 400),
                delay: const Duration(milliseconds: 100),
                child: _buildSection(
                  context,
                  title: 'Security',
                  children: [
                    _buildAnimatedSettingCard(
                      context,
                      icon: Icons.lock_outline,
                      title: 'Change Password',
                      subtitle: 'Update your password',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const ChangePasswordScreen(),
                          ),
                        );
                      },
                      delay: 0,
                    ),
                    _buildAnimatedSettingCard(
                      context,
                      icon: Icons.fingerprint,
                      title: 'Biometric Authentication',
                      subtitle: 'Enable fingerprint/face login',
                      trailing: Switch(
                        value: true,
                        onChanged: (value) async {
                          if (value) {
                            await BiometricService.authenticate();
                          }
                        },
                      ),
                      delay: 100,
                    ),
                    _buildAnimatedSettingCard(
                      context,
                      icon: Icons.security,
                      title: 'Two-Factor Authentication',
                      subtitle: 'Add an extra layer of security',
                      trailing: Switch(
                        value: false,
                        onChanged: (value) async {
                          if (value) {
                            final enabled = await Navigator.push<bool>(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const TwoFactorScreen(),
                              ),
                            );
                            if (enabled == true) {
                              // TODO: Update 2FA status in state management
                            }
                          } else {
                            // TODO: Handle 2FA disable flow
                          }
                        },
                      ),
                      delay: 200,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Verification
              Text(
                'Verification',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              _buildSettingCard(
                context,
                icon: Icons.person_outline,
                title: 'Identity Verification',
                subtitle: 'Complete KYC to increase limits',
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: SafeJetColors.warning.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'Pending',
                    style: TextStyle(
                      color: SafeJetColors.warning,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const IdentityVerificationScreen(),
                    ),
                  );
                },
              ),

              const SizedBox(height: 32),

              // API Management
              Text(
                'API Management',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              _buildSettingCard(
                context,
                icon: Icons.key,
                title: 'API Keys',
                subtitle: 'Manage your API keys',
                onTap: () {
                  // TODO: Show API keys management
                },
              ),

              const SizedBox(height: 32),

              // P2P Settings Section
              Text(
                'P2P Settings',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              _buildSettingCard(
                context,
                icon: Icons.payment,
                title: 'Payment Methods',
                subtitle: 'Manage your P2P payment methods',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const P2PPaymentMethodsScreen(),
                    ),
                  );
                },
              ),
              _buildSettingCard(
                context,
                icon: Icons.attach_money_outlined,
                title: 'Trading Preferences',
                subtitle: 'Set default currency and payment methods',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const P2PTradingPreferencesScreen(),
                    ),
                  );
                },
              ),
              _buildSettingCard(
                context,
                icon: Icons.message_outlined,
                title: 'Auto-Response Messages',
                subtitle: 'Manage quick responses for P2P chat',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const P2PAutoResponseScreen(),
                    ),
                  );
                },
              ),

              const SizedBox(height: 32),

              // Preferences
              Text(
                'Preferences',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              _buildSettingCard(
                context,
                icon: Icons.notifications_outlined,
                title: 'Notifications',
                subtitle: 'Manage push notifications',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const NotificationSettingsScreen(),
                    ),
                  );
                },
              ),
              _buildSettingCard(
                context,
                icon: Icons.language,
                title: 'Language',
                subtitle: 'English',
                onTap: () {
                  // TODO: Show language selection
                },
              ),
              _buildSettingCard(
                context,
                icon: isDark ? Icons.light_mode : Icons.dark_mode,
                title: 'Theme',
                subtitle: isDark ? 'Dark Mode' : 'Light Mode',
                trailing: Switch(
                  value: isDark,
                  onChanged: (value) {
                    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
                    themeProvider.toggleTheme();
                  },
                ),
              ),

              const SizedBox(height: 32),

              // Sign Out Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    // TODO: Implement sign out
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: SafeJetColors.error,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Sign Out',
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
    );
  }

  Widget _buildSettingCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? trailing,
    VoidCallback? onTap,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: isDark ? SafeJetColors.primaryAccent.withOpacity(0.1) : SafeJetColors.lightCardBackground,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDark 
              ? SafeJetColors.primaryAccent.withOpacity(0.2)
              : SafeJetColors.lightCardBorder,
        ),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Icon(
          icon,
          color: isDark ? Colors.white : Colors.black,
        ),
        title: Text(
          title,
          style: theme.textTheme.bodyLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
          ),
        ),
        trailing: trailing,
      ),
    );
  }

  Widget _buildAnimatedSettingCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? trailing,
    VoidCallback? onTap,
    required int delay,
  }) {
    return FadeInLeft(
      duration: const Duration(milliseconds: 300),
      delay: Duration(milliseconds: delay),
      child: _buildSettingCard(
        context,
        icon: icon,
        title: title,
        subtitle: subtitle,
        trailing: trailing,
        onTap: onTap,
      ),
    );
  }

  Widget _buildSection(
    BuildContext context, {
    required String title,
    required List<Widget> children,
  }) {
    final theme = Theme.of(context);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        ...children,
        const SizedBox(height: 32),
      ],
    );
  }
} 