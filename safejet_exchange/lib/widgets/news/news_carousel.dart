import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';

class NewsCarousel extends StatefulWidget {
  final bool isDark;

  const NewsCarousel({
    super.key,
    required this.isDark,
  });

  @override
  State<NewsCarousel> createState() => _NewsCarouselState();
}

class _NewsCarouselState extends State<NewsCarousel> {
  final List<Map<String, dynamic>> _news = [
    {
      'type': 'MARKET UPDATE',
      'title': 'Bitcoin Surges Past \$45K as Market Sentiment Improves',
      'time': '2h ago',
      'impact': 'high',
    },
    {
      'type': 'ANNOUNCEMENT',
      'title': 'New Trading Pairs Added: DOT/USDT and LINK/USDT',
      'time': '4h ago',
      'impact': 'medium',
    },
    {
      'type': 'ALERT',
      'title': 'ETH Breaks Key Resistance Level at \$2,800',
      'time': '5h ago',
      'impact': 'high',
    },
  ];

  Color _getImpactColor(String? impact) {
    switch (impact?.toLowerCase()) {
      case 'high':
        return SafeJetColors.warning;
      case 'medium':
        return SafeJetColors.info;
      default:
        return SafeJetColors.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'News & Updates',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              TextButton(
                onPressed: () {
                  // TODO: Navigate to news page
                },
                child: Row(
                  children: [
                    Text(
                      'See All',
                      style: TextStyle(
                        color: SafeJetColors.secondaryHighlight,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_rounded,
                      color: SafeJetColors.secondaryHighlight,
                      size: 16,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 130,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _news.length,
            itemBuilder: (context, index) {
              final news = _news[index];
              return FadeInRight(
                delay: Duration(milliseconds: index * 100),
                child: _buildNewsCard(news),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildNewsCard(Map<String, dynamic> news) {
    return Container(
      width: MediaQuery.of(context).size.width * 0.75,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: widget.isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: widget.isDark
              ? SafeJetColors.primaryAccent.withOpacity(0.2)
              : SafeJetColors.lightCardBorder,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: double.infinity,
            decoration: BoxDecoration(
              color: _getImpactColor(news['impact'] as String?),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: SafeJetColors.secondaryHighlight.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        (news['type'] as String?) ?? 'UPDATE',
                        style: TextStyle(
                          color: SafeJetColors.secondaryHighlight,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: _getImpactColor(news['impact'] as String?)
                            .withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.trending_up,
                            color: _getImpactColor(news['impact'] as String?),
                            size: 10,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            ((news['impact'] as String?) ?? 'LOW').toUpperCase(),
                            style: TextStyle(
                              color: _getImpactColor(news['impact'] as String?),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: Text(
                    (news['title'] as String?) ?? 'No title available',
                    style: TextStyle(
                      color: widget.isDark ? Colors.white : Colors.black,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  (news['time'] as String?) ?? '',
                  style: TextStyle(
                    color: widget.isDark
                        ? Colors.grey[400]
                        : SafeJetColors.lightTextSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
} 