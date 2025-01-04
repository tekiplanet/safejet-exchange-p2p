import 'package:flutter/material.dart';
import '../config/theme/colors.dart';
import 'package:provider/provider.dart';
import '../config/theme/theme_provider.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final VoidCallback? onNotificationTap;
  final VoidCallback? onThemeToggle;
  final String? title;
  final Widget? trailing;
  final bool hasNotification;

  const CustomAppBar({
    super.key,
    this.onNotificationTap,
    this.onThemeToggle,
    this.title,
    this.trailing,
    this.hasNotification = false,
  });

  @override
  Size get preferredSize => const Size.fromHeight(70);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: isDark 
            ? SafeJetColors.primaryBackground
            : SafeJetColors.lightBackground,
      ),
      child: SafeArea(
        child: SizedBox(
          height: 56,
          child: Row(
            children: [
              // Logo Section
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: SafeJetColors.secondaryHighlight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.rocket_launch_rounded,
                  color: Colors.black,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              
              // Title with flex to allow it to shrink
              Expanded(
                child: Text(
                  title ?? 'SafeJet',
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: isDark ? Colors.white : SafeJetColors.lightText,
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              
              // Action buttons in a Row with minimum size
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (trailing != null) trailing!,
                  if (trailing != null) const SizedBox(width: 8),
                  IconButton(
                    onPressed: onNotificationTap,
                    icon: Stack(
                      children: [
                        const Icon(Icons.notifications_outlined),
                        if (hasNotification)
                          Positioned(
                            right: 0,
                            top: 0,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: SafeJetColors.secondaryHighlight,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: onThemeToggle,
                    icon: Icon(
                      isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
} 