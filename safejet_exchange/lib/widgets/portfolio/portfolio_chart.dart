import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../config/theme/colors.dart';
import 'dart:math' show sin, pi, min, max, Random;

class PortfolioChart extends StatefulWidget {
  final bool isDark;
  final String timeframe;

  const PortfolioChart({
    super.key,
    required this.isDark,
    required this.timeframe,
  });

  @override
  State<PortfolioChart> createState() => _PortfolioChartState();
}

class _PortfolioChartState extends State<PortfolioChart> {
  // Dummy data - replace with real data later
  List<FlSpot> get spotData {
    switch (widget.timeframe) {
      case '24h':
        return List.generate(24, (i) {
          return FlSpot(i.toDouble(), 
            10000 + 2000 * sin(i * pi / 12) + Random().nextDouble() * 500);
        });
      case '7d':
        return List.generate(7, (i) {
          return FlSpot(i.toDouble(), 
            11000 + 1500 * sin(i * pi / 3.5) + Random().nextDouble() * 300);
        });
      case '30d':
        return List.generate(30, (i) {
          return FlSpot(i.toDouble(), 
            12000 + 3000 * sin(i * pi / 15) + Random().nextDouble() * 1000);
        });
      default:
        return [];
    }
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1.70,
      child: Padding(
        padding: const EdgeInsets.only(
          right: 18,
          left: 12,
          top: 24,
          bottom: 12,
        ),
        child: LineChart(
          mainData(),
        ),
      ),
    );
  }

  Widget bottomTitleWidgets(double value, TitleMeta meta) {
    const style = TextStyle(
      fontSize: 10,
      fontWeight: FontWeight.bold,
      color: Colors.grey,
    );

    String text;
    switch (widget.timeframe) {
      case '24h':
        if (value % 6 == 0) {
          text = '${value.toInt()}:00';
        } else {
          return Container();
        }
        break;
      case '7d':
        text = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][value.toInt() % 7];
        break;
      case '30d':
        if (value % 5 == 0) {
          text = '${value.toInt() + 1}d';
        } else {
          return Container();
        }
        break;
      default:
        return Container();
    }

    return SideTitleWidget(
      axisSide: meta.axisSide,
      child: Text(text, style: style),
    );
  }

  LineChartData mainData() {
    return LineChartData(
      gridData: FlGridData(
        show: true,
        drawVerticalLine: true,
        horizontalInterval: 1000,
        verticalInterval: widget.timeframe == '24h' ? 6 : 1,
        getDrawingHorizontalLine: (value) {
          return FlLine(
            color: widget.isDark 
                ? Colors.white.withOpacity(0.05)
                : Colors.black.withOpacity(0.05),
            strokeWidth: 1,
          );
        },
        getDrawingVerticalLine: (value) {
          return FlLine(
            color: widget.isDark 
                ? Colors.white.withOpacity(0.05)
                : Colors.black.withOpacity(0.05),
            strokeWidth: 1,
          );
        },
      ),
      titlesData: FlTitlesData(
        show: true,
        rightTitles: const AxisTitles(
          sideTitles: SideTitles(showTitles: false),
        ),
        topTitles: const AxisTitles(
          sideTitles: SideTitles(showTitles: false),
        ),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 30,
            interval: 1,
            getTitlesWidget: bottomTitleWidgets,
          ),
        ),
        leftTitles: const AxisTitles(
          sideTitles: SideTitles(showTitles: false),
        ),
      ),
      borderData: FlBorderData(
        show: false,
      ),
      minX: 0,
      maxX: widget.timeframe == '24h' 
          ? 23 
          : widget.timeframe == '7d' 
              ? 6 
              : 29,
      minY: spotData.map((e) => e.y).reduce(min) - 500,
      maxY: spotData.map((e) => e.y).reduce(max) + 500,
      lineBarsData: [
        LineChartBarData(
          spots: spotData,
          isCurved: true,
          gradient: LinearGradient(
            colors: [
              SafeJetColors.secondaryHighlight,
              SafeJetColors.secondaryHighlight.withOpacity(0.8),
            ],
          ),
          barWidth: 2,
          isStrokeCapRound: true,
          dotData: const FlDotData(
            show: false,
          ),
          belowBarData: BarAreaData(
            show: true,
            gradient: LinearGradient(
              colors: [
                SafeJetColors.secondaryHighlight.withOpacity(0.2),
                SafeJetColors.secondaryHighlight.withOpacity(0.0),
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
      ],
      lineTouchData: LineTouchData(
        touchTooltipData: LineTouchTooltipData(
          tooltipBgColor: widget.isDark 
              ? SafeJetColors.primaryAccent
              : Colors.white,
          tooltipRoundedRadius: 8,
          getTooltipItems: (touchedSpots) {
            return touchedSpots.map((LineBarSpot touchedSpot) {
              return LineTooltipItem(
                '\$${touchedSpot.y.toStringAsFixed(2)}',
                TextStyle(
                  color: widget.isDark ? Colors.white : Colors.black,
                  fontWeight: FontWeight.bold,
                ),
              );
            }).toList();
          },
        ),
      ),
    );
  }
} 