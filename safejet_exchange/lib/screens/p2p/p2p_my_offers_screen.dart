import 'package:flutter/material.dart';
import '../../config/theme/colors.dart';
import '../../widgets/p2p_app_bar.dart';
import 'package:provider/provider.dart';
import '../../config/theme/theme_provider.dart';

class P2PMyOffersScreen extends StatefulWidget {
  const P2PMyOffersScreen({super.key});

  @override
  State<P2PMyOffersScreen> createState() => _P2PMyOffersScreenState();
}

class _P2PMyOffersScreenState extends State<P2PMyOffersScreen> {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'My Offers',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: DefaultTabController(
        length: 2,
        child: Column(
          children: [
            TabBar(
              tabs: const [
                Tab(text: 'Active'),
                Tab(text: 'Completed'),
              ],
              labelColor: SafeJetColors.secondaryHighlight,
              unselectedLabelColor: isDark ? Colors.grey : SafeJetColors.lightTextSecondary,
              indicatorColor: SafeJetColors.secondaryHighlight,
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _buildOffersList(isDark, isActive: true),
                  _buildOffersList(isDark, isActive: false),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOffersList(bool isDark, {required bool isActive}) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 0, // We'll update this when we implement the backend
      itemBuilder: (context, index) {
        return Container(); // We'll implement the offer card later
      },
    );
  }
} 