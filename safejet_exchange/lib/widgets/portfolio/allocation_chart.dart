import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../config/theme/colors.dart';

class AllocationChart extends StatefulWidget {
  final bool isDark;

  const AllocationChart({
    super.key,
    required this.isDark,
  });

  @override
  State<AllocationChart> createState() => _AllocationChartState();
}

class _AllocationChartState extends State<AllocationChart> {
  int touchedIndex = -1;

  // Dummy data - replace with real data later
  final List<Map<String, dynamic>> assets = [
    {
      'name': 'BTC',
      'value': 45.0,
      'color': const Color(0xFFF7931A),
    },
    {
      'name': 'ETH',
      'value': 30.0,
      'color': const Color(0xFF627EEA),
    },
    {
      'name': 'USDT',
      'value': 15.0,
      'color': const Color(0xFF26A17B),
    },
    {
      'name': 'Others',
      'value': 10.0,
      'color': const Color(0xFF8C8C8C),
    },
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 140,
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: PieChart(
              PieChartData(
                pieTouchData: PieTouchData(
                  touchCallback: (FlTouchEvent event, pieTouchResponse) {
                    setState(() {
                      if (!event.isInterestedForInteractions ||
                          pieTouchResponse == null ||
                          pieTouchResponse.touchedSection == null) {
                        touchedIndex = -1;
                        return;
                      }
                      touchedIndex = pieTouchResponse.touchedSection!.touchedSectionIndex;
                    });
                  },
                ),
                borderData: FlBorderData(show: false),
                sectionsSpace: 2,
                centerSpaceRadius: 35,
                sections: _generateSections(),
                startDegreeOffset: -90,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: assets.map((asset) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2.0),
                    child: _buildIndicator(
                      color: asset['color'],
                      text: '${asset['name']} ${asset['value']}%',
                      isSquare: true,
                      size: 10,
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<PieChartSectionData> _generateSections() {
    return List.generate(assets.length, (i) {
      final isTouched = i == touchedIndex;
      final fontSize = isTouched ? 16.0 : 12.0;
      final radius = isTouched ? 55.0 : 50.0;
      final value = assets[i]['value'] as double;

      return PieChartSectionData(
        color: assets[i]['color'],
        value: value,
        title: value >= 15 ? '${value.toInt()}%' : '',
        radius: radius,
        titleStyle: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.bold,
          color: widget.isDark ? Colors.white : Colors.black,
        ),
        titlePositionPercentageOffset: 0.5,
      );
    });
  }

  Widget _buildIndicator({
    required Color color,
    required String text,
    required bool isSquare,
    double size = 10,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: isSquare ? BoxShape.rectangle : BoxShape.circle,
            color: color,
            borderRadius: isSquare ? BorderRadius.circular(2) : null,
          ),
        ),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 11,
              color: widget.isDark ? Colors.white : Colors.black,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
} 