import 'package:flutter/material.dart';
import '../config/theme/colors.dart';

class MiniChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = SafeJetColors.success.withOpacity(0.5)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final path = Path();
    
    // Sample data points
    final points = [
      Offset(0, size.height * 0.5),
      Offset(size.width * 0.2, size.height * 0.3),
      Offset(size.width * 0.4, size.height * 0.7),
      Offset(size.width * 0.6, size.height * 0.4),
      Offset(size.width * 0.8, size.height * 0.6),
      Offset(size.width, size.height * 0.2),
    ];

    path.moveTo(points[0].dx, points[0].dy);
    
    for (var i = 0; i < points.length - 1; i++) {
      final p0 = points[i];
      final p1 = points[i + 1];
      
      path.quadraticBezierTo(
        p0.dx + (p1.dx - p0.dx) / 2,
        p0.dy,
        p0.dx + (p1.dx - p0.dx) / 2,
        p1.dy,
      );
    }

    canvas.drawPath(path, paint);

    // Fill gradient
    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    final gradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        SafeJetColors.success.withOpacity(0.2),
        SafeJetColors.success.withOpacity(0),
      ],
    );

    canvas.drawPath(
      fillPath,
      Paint()..shader = gradient.createShader(
        Rect.fromLTWH(0, 0, size.width, size.height),
      ),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
} 