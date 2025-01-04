import 'package:flutter/material.dart';
import '../config/theme/colors.dart';
import 'package:animate_do/animate_do.dart';
import '../models/coin.dart';

class NetworkSelectionModal extends StatelessWidget {
  final List<Network> networks;
  final Network selectedNetwork;

  const NetworkSelectionModal({
    super.key,
    required this.networks,
    required this.selectedNetwork,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.5,
      decoration: BoxDecoration(
        color: isDark ? SafeJetColors.primaryBackground : SafeJetColors.lightBackground,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: isDark ? Colors.white24 : Colors.black12,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Title
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Select Network',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

          // Networks List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: networks.length,
              itemBuilder: (context, index) {
                final network = networks[index];
                final isSelected = network.name == selectedNetwork.name;

                return FadeInDown(
                  duration: const Duration(milliseconds: 600),
                  delay: Duration(milliseconds: 100 * index),
                  child: InkWell(
                    onTap: network.isActive ? () => Navigator.pop(context, network) : null,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isDark 
                            ? SafeJetColors.primaryAccent.withOpacity(0.1)
                            : SafeJetColors.lightCardBackground,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark
                              ? SafeJetColors.primaryAccent.withOpacity(0.2)
                              : SafeJetColors.lightCardBorder,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  network.name,
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: network.isActive 
                                        ? null 
                                        : (isDark ? Colors.grey[600] : Colors.grey[400]),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Average arrival time: ${network.arrivalTime}',
                                  style: TextStyle(
                                    color: network.isActive
                                        ? (isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary)
                                        : (isDark ? Colors.grey[600] : Colors.grey[400]),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (isSelected)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: SafeJetColors.success.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'Selected',
                                style: TextStyle(
                                  color: SafeJetColors.success,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            )
                          else if (!network.isActive)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'Coming Soon',
                                style: TextStyle(
                                  color: isDark ? Colors.grey[600] : Colors.grey[400],
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
} 