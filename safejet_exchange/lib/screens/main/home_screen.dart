import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/custom_app_bar.dart';
import '../../widgets/custom_bottom_nav.dart';
import 'tabs/markets_tab.dart';
import 'tabs/trade_tab.dart';
import 'tabs/home_tab.dart';
import 'tabs/wallets_tab.dart';
import 'tabs/profile_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 2;

  final List<Widget> _screens = [
    const MarketsTab(),
    const TradeTab(),
    const HomeTab(),
    const WalletsTab(),
    const ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    
    return Material(
      child: Scaffold(
        extendBody: true,
        extendBodyBehindAppBar: true,
        backgroundColor: Colors.transparent,
        appBar: CustomAppBar(
          onNotificationTap: () {
            // TODO: Show notifications
          },
          onThemeToggle: () {
            themeProvider.toggleTheme();
          },
        ),
        body: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                themeProvider.backgroundColor,
                themeProvider.backgroundColor.withOpacity(0.8),
              ],
            ),
          ),
          child: _screens[_currentIndex],
        ),
        bottomNavigationBar: CustomBottomNav(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
        ),
      ),
    );
  }
} 